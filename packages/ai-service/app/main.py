from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.logging import logger
from app.core.config import get_settings
from app.core.exceptions import AIServiceError
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
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"}
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
