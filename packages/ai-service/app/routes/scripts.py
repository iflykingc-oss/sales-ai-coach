import asyncio
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
    """Generate sales scripts with SSE streaming for real-time progress updates.

    Events:
    - step_start: {step, description}
    - step_complete: {step, result}
    - token: {content} (streaming generation tokens)
    - done: {full_result}
    - error: {message}
    """
    async def event_generator():
        try:
            harness = ScriptGenerationHarness()

            # Step 1: Scene analysis
            yield sse_event("step_start", {"step": "scene_analysis", "description": "分析场景..."})

            # We'll use the harness but emit events at each stage
            # For now, run the full pipeline and emit progress
            result = await harness.generate(
                input_text=req.input,
                input_type=req.inputType,
                industry=req.industry,
                knowledge_context=req.context,
                frameworks=req.frameworks or None,
            )

            # Emit intermediate results from the harness
            if "scene_analysis" in result:
                yield sse_event("step_complete", {
                    "step": "scene_analysis",
                    "result": result["scene_analysis"],
                })

            yield sse_event("step_start", {"step": "knowledge_retrieval", "description": "检索知识..."})

            if "knowledge_results" in result:
                yield sse_event("step_complete", {
                    "step": "knowledge_retrieval",
                    "count": len(result.get("knowledge_results", [])),
                })

            yield sse_event("step_start", {"step": "generation", "description": "生成话术..."})

            # Stream the main script content
            script_content = result.get("script", "")
            if script_content:
                # Simulate token-by-token streaming for the script
                chunk_size = 5
                for i in range(0, len(script_content), chunk_size):
                    if await request.is_disconnected():
                        break
                    chunk = script_content[i:i + chunk_size]
                    yield sse_event("token", {"content": chunk})
                    await asyncio.sleep(0.01)  # Small delay for smooth streaming

            # Quality report
            quality = result.get("quality_report", {})
            if quality:
                yield sse_event("step_complete", {
                    "step": "quality_check",
                    "score": quality.get("score"),
                })

            logger.info(
                f"Script generated (stream): quality={quality.get('score', 'N/A')}, "
                f"retries={result.get('execution_report', {}).get('retries', 0)}"
            )

            # Final result
            yield sse_event("done", {"status": "complete", "result": result})

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Script generation stream error: {e}")
            yield sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        },
    )
