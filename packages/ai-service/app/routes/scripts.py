from fastapi import APIRouter
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
