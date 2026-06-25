import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.script_harness import ScriptGenerationHarness
from app.core.logging import logger

router = APIRouter()


class ScriptGenerateRequest(BaseModel):
    input: str
    inputType: str
    industry: str = ""
    context: str = ""
    userId: str = ""
    frameworks: list[str] = []  # Analytical framework IDs to apply
    useHarness: bool = True  # Use harness pipeline by default


class ScriptGenerateResponse(BaseModel):
    success: bool
    data: dict


def sse_event(event: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/generate", response_model=ScriptGenerateResponse)
async def generate_script(req: ScriptGenerateRequest):
    """Generate sales scripts with harness-powered quality pipeline."""
    harness = ScriptGenerationHarness()
    result = await harness.generate(
        input_text=req.input,
        input_type=req.inputType,
        industry=req.industry,
        knowledge_context=req.context,
        frameworks=req.frameworks or None,
    )
    logger.info(
        f"Script generated: quality={result.get('quality_report', {}).get('score', 'N/A')}, "
        f"retries={result.get('execution_report', {}).get('retries', 0)}"
    )
    return ScriptGenerateResponse(success=True, data=result)


@router.post("/generate/stream")
async def generate_script_stream(req: ScriptGenerateRequest, request: Request):
    """Generate sales scripts with real SSE streaming.

    The speech_generate step uses the LLM's streaming API for true token-by-token
    delivery instead of simulating it by slicing a completed response.

    Events:
    - step_start: {step, description}
    - step_complete: {step, ...}
    - token: {content} (real LLM streaming tokens)
    - done: {result}
    - error: {message}
    """
    async def event_generator():
        harness = ScriptGenerationHarness()
        async for event in harness.generate_stream(
            input_text=req.input,
            input_type=req.inputType,
            industry=req.industry,
            knowledge_context=req.context,
            frameworks=req.frameworks or None,
        ):
            if await request.is_disconnected():
                break
            etype = event.pop("event")
            yield sse_event(etype, event)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
