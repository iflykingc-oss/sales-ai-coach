from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    models: list[str]


@router.get("/health")
async def health_check():
    available_models = []
    try:
        from app.models.router import model_router
        if model_router._primary:
            available_models.append(model_router._primary.get_model_name())
        for fb in model_router.get_fallbacks():
            available_models.append(fb.get_model_name())
    except Exception:
        available_models = ["none"]

    return HealthResponse(status="ok", models=available_models)
