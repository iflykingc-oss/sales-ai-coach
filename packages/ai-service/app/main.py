from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import logger
from app.core.exceptions import AIServiceError
from app.middleware.auth import APIKeyAuthMiddleware
from app.middleware.rate_limit import SlidingWindowRateLimiter
from app.routes import router
from app.routes.im_webhook import router as im_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: start/stop background resources cleanly."""
    logger.info("AI Service starting up...")
    from app.im.manager import im_manager
    try:
        await im_manager.start()
    except Exception as e:
        logger.error(f"[lifespan] IM manager failed to start: {e}")
    yield
    logger.info("AI Service shutting down...")
    try:
        await im_manager.stop()
    except Exception as e:
        logger.error(f"[lifespan] IM manager stop error: {e}")


app = FastAPI(
    title="Sales AI Coach - AI Service",
    description="Multi-model AI proxy service for the Sales AI Coach platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: pull origins from settings, default to localhost:5173 in dev.
# In production, set CORS_ORIGINS explicitly.
_cors_origins = settings.cors_origins if settings.cors_origins else ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-api-key", "x-request-id"],
    max_age=600,
)

# Inbound auth: must be added BEFORE the rate limit middleware so unauthenticated
# traffic is rejected without consuming rate-limit budget.
# In production, hard-exit if the key is missing. In dev, log a warning.
if settings.ai_service_api_key:
    app.add_middleware(APIKeyAuthMiddleware, api_key=settings.ai_service_api_key)
else:
    _msg = "[main] AI_SERVICE_API_KEY not set. AI service is unauthenticated."
    if settings.debug:
        logger.warning(_msg + " (debug mode; continuing)")
    else:
        logger.error(_msg + " Refusing to start in non-debug mode.")
        raise SystemExit(1)

# Rate limiting middleware
rate_limiter = SlidingWindowRateLimiter(
    requests_per_minute=settings.requests_per_minute,
    redis_url=settings.redis_url,
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health check endpoint
    if request.url.path in ("/health", "/healthz"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    if not await rate_limiter.is_allowed(client_ip):
        retry_after = await rate_limiter.get_retry_after(client_ip)
        logger.warning(f"Rate limit exceeded for {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": "Rate limit exceeded. Please try again later."},
            headers={"Retry-After": str(retry_after)},
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(settings.requests_per_minute)
    response.headers["X-RateLimit-Remaining"] = str(await rate_limiter.get_remaining(client_ip))
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
    import uuid
    request_id = uuid.uuid4().hex
    logger.error(f"[{request_id}] Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "request_id": request_id}
    )


@app.get("/health")
@app.get("/healthz")
async def health():
    return {"status": "ok"}
