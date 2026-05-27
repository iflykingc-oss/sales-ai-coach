import json
import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.practice_harness import PracticeHarness
from app.core.logging import logger

router = APIRouter()

# In-memory session store (replace with Redis/DB in production)
_sessions: dict[str, dict] = {}  # {session_id: {"harness": PracticeHarness, "last_access": float}}
_MAX_SESSIONS = 500
_SESSION_TTL = 3600  # 1 hour


def _cleanup_sessions():
    now = time.time()
    # Remove expired sessions
    expired = [sid for sid, data in _sessions.items() if now - data["last_access"] > _SESSION_TTL]
    for sid in expired:
        del _sessions[sid]
    # If still over limit, remove oldest
    while len(_sessions) > _MAX_SESSIONS:
        oldest = min(_sessions, key=lambda k: _sessions[k]["last_access"])
        del _sessions[oldest]


class PracticeInitRequest(BaseModel):
    scenario: str
    industry: str = ""
    mode: str = "scenario"
    sessionId: str = ""
    maxRounds: int = 10
    userId: str = ""
    logicFramework: str = ""  # Sales logic framework to use
    difficulty: str = "medium"  # easy/medium/hard/expert


class PracticeMessageRequest(BaseModel):
    sessionId: str
    message: str
    logicFramework: str = ""  # Current logic framework stage


class PracticeReportRequest(BaseModel):
    sessionId: str


class PracticeHintRequest(BaseModel):
    sessionId: str


class PracticeResponse(BaseModel):
    success: bool
    data: dict


@router.post("/init", response_model=PracticeResponse)
async def init_session(req: PracticeInitRequest):
    """Initialize a new AI practice session with harness-powered persona generation."""
    import uuid

    session_id = req.sessionId or uuid.uuid4().hex[:12]
    harness = PracticeHarness(session_id=session_id)

    result = await harness.init_session(
        scenario=req.scenario,
        industry=req.industry,
        mode=req.mode,
        max_rounds=req.maxRounds,
        difficulty=req.difficulty,
    )

    _cleanup_sessions()
    _sessions[session_id] = {"harness": harness, "last_access": time.time()}
    logger.info(f"Practice session initialized: {session_id}")
    return PracticeResponse(success=True, data=result)


@router.post("/message", response_model=PracticeResponse)
async def send_message(req: PracticeMessageRequest):
    """Send a message in an active practice session."""
    _cleanup_sessions()
    session_data = _sessions.get(req.sessionId)
    if not session_data:
        return PracticeResponse(success=False, data={"error": "会话不存在或已结束"})

    session_data["last_access"] = time.time()
    harness = session_data["harness"]
    result = await harness.respond(req.message, logic_framework=req.logicFramework)
    return PracticeResponse(success=True, data=result)


@router.post("/message/stream")
async def send_message_stream(req: PracticeMessageRequest):
    """Stream a practice message response via SSE."""
    _cleanup_sessions()
    session_data = _sessions.get(req.sessionId)
    if not session_data:
        return PracticeResponse(success=False, data={"error": "会话不存在或已结束"})

    session_data["last_access"] = time.time()
    harness = session_data["harness"]

    async def event_generator():
        async for event in harness.respond_stream(req.message, logic_framework=req.logicFramework):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/report", response_model=PracticeResponse)
async def generate_report(req: PracticeReportRequest):
    """Generate a comprehensive practice session report."""
    _cleanup_sessions()
    session_data = _sessions.get(req.sessionId)
    if not session_data:
        return PracticeResponse(success=False, data={"error": "会话不存在"})

    session_data["last_access"] = time.time()
    harness = session_data["harness"]
    report = await harness.generate_report()
    logger.info(f"Practice report generated for session {req.sessionId}")
    return PracticeResponse(success=True, data=report)


@router.post("/hint", response_model=PracticeResponse)
async def get_coaching_hint(req: PracticeHintRequest):
    """Generate a contextual coaching hint based on conversation history."""
    _cleanup_sessions()
    session_data = _sessions.get(req.sessionId)
    if not session_data:
        return PracticeResponse(success=False, data={"error": "会话不存在或已结束"})

    session_data["last_access"] = time.time()
    harness = session_data["harness"]
    hint = await harness.generate_coaching_hint()
    return PracticeResponse(success=True, data=hint)


@router.get("/session/{session_id}")
async def get_session_state(session_id: str):
    """Get current state of a practice session."""
    _cleanup_sessions()
    session_data = _sessions.get(session_id)
    if not session_data:
        return {"success": False, "data": {"error": "会话不存在"}}
    session_data["last_access"] = time.time()
    return {"success": True, "data": session_data["harness"].get_session_state()}
