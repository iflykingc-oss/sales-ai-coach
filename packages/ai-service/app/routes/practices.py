import json
import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.practice_harness import PracticeHarness
from app.core.logging import logger
from app.core.config import get_settings

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
    scriptId: str = ""
    maxRounds: int = 10
    userId: str = ""
    logicFramework: str = ""  # Sales logic framework to use
    difficulty: str = "medium"  # easy/medium/hard/expert
    knowledgeContext: str = ""  # RAG knowledge context from user's knowledge base


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


class AnalyzeDocumentRequest(BaseModel):
    fileName: str
    content: str


@router.post("/analyze-document", response_model=PracticeResponse)
async def analyze_document(req: AnalyzeDocumentRequest):
    """Analyze uploaded document and extract key information for practice context."""
    from app.models.router import model_router

    prompt = f"""分析以下企业文档，提取关键信息用于销售陪练：

文档名称: {req.fileName}
文档内容:
{req.content[:3000]}

请提取并总结：
1. 产品/服务核心卖点
2. 目标客户画像
3. 常见客户异议及应对策略
4. 关键话术和销售技巧
5. 行业背景知识

输出格式要求：
- 简洁明了，每个要点1-2句话
- 总字数控制在300字以内
- 重点突出可用于实战的内容"""

    messages = [{"role": "user", "content": prompt}]
    result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=500)

    summary = result.get("content", "文档已分析")

    return PracticeResponse(success=True, data={"summary": summary})


@router.post("/init", response_model=PracticeResponse)
async def init_session(req: PracticeInitRequest):
    """Initialize a new AI practice session.

    Uses LangGraph orchestrator when USE_LANGGRAPH_COACHING=true,
    otherwise falls back to the legacy PracticeHarness.
    """
    import uuid
    settings = get_settings()

    session_id = req.sessionId or uuid.uuid4().hex[:12]

    if settings.use_langgraph_coaching:
        # LangGraph multi-agent orchestrator
        from app.graphs.orchestrator import PracticeOrchestrator
        harness = PracticeOrchestrator(session_id=session_id)
    else:
        # Legacy single-agent harness
        harness = PracticeHarness(session_id=session_id)

    init_kwargs = dict(
        scenario=req.scenario,
        industry=req.industry,
        mode=req.mode,
        max_rounds=req.maxRounds,
        difficulty=req.difficulty,
        knowledge_context=req.knowledgeContext,
    )

    if settings.use_langgraph_coaching:
        init_kwargs["logic_framework"] = req.logicFramework

    result = await harness.init_session(**init_kwargs)

    _cleanup_sessions()
    _sessions[session_id] = {"harness": harness, "last_access": time.time()}
    logger.info(f"Practice session initialized: {session_id} (langgraph={settings.use_langgraph_coaching})")
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
