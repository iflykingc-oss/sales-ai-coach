from fastapi import APIRouter
from pydantic import BaseModel
from app.services.script_generator import generate_sales_script

router = APIRouter()


class ScriptGenerateRequest(BaseModel):
    input: str
    inputType: str
    industry: str = ""
    context: str = ""
    userId: str = ""


class ScriptGenerateResponse(BaseModel):
    success: bool
    data: dict


@router.post("/generate", response_model=ScriptGenerateResponse)
async def generate_script(req: ScriptGenerateRequest):
    """Generate sales scripts from user input."""
    result = await generate_sales_script(
        input_text=req.input,
        input_type=req.inputType,
        industry=req.industry,
        context=req.context,
    )
    return ScriptGenerateResponse(success=True, data=result)
