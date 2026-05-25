from fastapi import APIRouter
from pydantic import BaseModel
from app.services.review_analyzer import analyze_conversations

router = APIRouter()


class ReviewAnalyzeRequest(BaseModel):
    conversations: list[dict]
    userId: str = ""


@router.post("/analyze")
async def analyze_review(req: ReviewAnalyzeRequest):
    """Analyze conversations and generate review report."""
    result = await analyze_conversations(conversations=req.conversations)
    return {"success": True, "data": result}
