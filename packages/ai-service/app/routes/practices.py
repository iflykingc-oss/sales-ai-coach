from fastapi import APIRouter
from pydantic import BaseModel
from app.services.practice_harness import PracticeHarness
from app.core.logging import logger

router = APIRouter()

# In-memory session store (replace with Redis/DB in production)
_sessions: dict[str, PracticeHarness] = {}


class PracticeInitRequest(BaseModel):
    scenario: str
    industry: str = ""
    mode: str = "scenario"
    sessionId: str = ""
    maxRounds: int = 10
    userId: str = ""


class PracticeMessageRequest(BaseModel):
    sessionId: str
    message: str


class PracticeReportRequest(BaseModel):
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
    )

    _sessions[session_id] = harness
    logger.info(f"Practice session initialized: {session_id}")
    return PracticeResponse(success=True, data=result)


@router.post("/message", response_model=PracticeResponse)
async def send_message(req: PracticeMessageRequest):
    """Send a message in an active practice session."""
    harness = _sessions.get(req.sessionId)
    if not harness:
        return PracticeResponse(success=False, data={"error": "会话不存在或已结束"})

    result = await harness.respond(req.message)
    return PracticeResponse(success=True, data=result)


@router.post("/report", response_model=PracticeResponse)
async def generate_report(req: PracticeReportRequest):
    """Generate a comprehensive practice session report."""
    harness = _sessions.get(req.sessionId)
    if not harness:
        return PracticeResponse(success=False, data={"error": "会话不存在"})

    report = await harness.generate_report()
    logger.info(f"Practice report generated for session {req.sessionId}")
    return PracticeResponse(success=True, data=report)


@router.get("/session/{session_id}")
async def get_session_state(session_id: str):
    """Get current state of a practice session."""
    harness = _sessions.get(session_id)
    if not harness:
        return {"success": False, "data": {"error": "会话不存在"}}
    return {"success": True, "data": harness.get_session_state()}
