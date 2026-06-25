from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.logging import logger
from app.core.config import get_settings
from app.core.exceptions import AIServiceError
from app.middleware.rate_limit import SlidingWindowRateLimiter
from app.routes import router
from app.routes.im_webhook import router as im_router

settings = get_settings()

app = FastAPI(
    title="Sales AI Coach - AI Service",
    description="Multi-model AI proxy service for the Sales AI Coach platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if hasattr(settings, 'cors_origins') else ["http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
rate_limiter = SlidingWindowRateLimiter(requests_per_minute=settings.requests_per_minute)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health check endpoint
    if request.url.path in ("/health", "/healthz"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        retry_after = rate_limiter.get_retry_after(client_ip)
        logger.warning(f"Rate limit exceeded for {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": "Rate limit exceeded. Please try again later."},
            headers={"Retry-After": str(retry_after)},
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(settings.requests_per_minute)
    response.headers["X-RateLimit-Remaining"] = str(rate_limiter.get_remaining(client_ip))
    return response

app.include_router(router)
app.include_router(im_router)


@app.exception_handler(AIServiceError)
async def ai_service_error_handler(request, exc: AIServiceError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.message}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    request_id = str(id(request))
    logger.error(f"[{request_id}] Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "request_id": request_id}
    )


@app.on_event("startup")
async def startup():
    logger.info("AI Service starting up...")
    # Start IM channels (Feishu/DingTalk) if configured
    from app.im.manager import im_manager
    await im_manager.start()


@app.on_event("shutdown")
async def shutdown():
    logger.info("AI Service shutting down...")
    # Stop IM channels
    from app.im.manager import im_manager
    await im_manager.stop()
