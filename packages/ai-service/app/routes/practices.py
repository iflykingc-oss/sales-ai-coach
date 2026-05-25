from fastapi import APIRouter
from pydantic import BaseModel
from app.services.practice_engine import process_practice_message

router = APIRouter()


class PracticeMessageRequest(BaseModel):
    scenario: str
    industry: str = ""
    mode: str = "scenario"
    messages: list[dict]
    userId: str = ""


class PracticeMessageResponse(BaseModel):
    success: bool
    data: dict


@router.post("/message", response_model=PracticeMessageResponse)
async def send_message(req: PracticeMessageRequest):
    """Send a message in a practice session and get customer response."""
    result = await process_practice_message(
        scenario=req.scenario,
        messages=req.messages,
        industry=req.industry,
        mode=req.mode,
    )
    return PracticeMessageResponse(success=True, data=result)
