from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    models: list[str]
    harness: dict


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

    return HealthResponse(
        status="ok",
        version="0.2.0",  # Bumped to indicate harness integration
        models=available_models,
        harness={
            "enabled": True,
            "patterns": [
                "two-agent-planner-executor",
                "feature-list-state",
                "context-compaction",
                "generator-evaluator-separation",
                "progress-tracking",
            ],
        },
    )


class HarnessStatusResponse(BaseModel):
    success: bool
    data: dict


@router.get("/harness/status")
async def harness_status():
    """Return the current status of the harness system."""
    from app.routes.practices import _sessions

    active_sessions = len(_sessions)
    active_details = []
    for sid, session_data in _sessions.items():
        harness = session_data.get("harness")
        if harness and getattr(harness, "is_active", False):
            active_details.append({
                "session_id": sid,
                "rounds": getattr(harness, "round_count", 0),
                "max_rounds": getattr(harness, "max_rounds", 0),
            })

    return HarnessStatusResponse(
        success=True,
        data={
            "active_sessions": active_sessions,
            "sessions": active_details,
            "patterns": [
                "two-agent-planner-executor",
                "feature-list-state",
                "context-compaction",
                "generator-evaluator-separation",
                "progress-tracking",
            ],
        },
    )
