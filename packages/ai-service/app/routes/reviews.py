from fastapi import APIRouter
from pydantic import BaseModel
from app.services.review_harness import ReviewAnalyzer
from app.core.logging import logger

router = APIRouter()


class ReviewAnalyzeRequest(BaseModel):
    conversations: list[dict]
    userId: str = ""
    history: str = ""  # Previous review reports for trend analysis
    knowledgeContext: str = ""  # User's knowledge base for benchmarking


@router.post("/analyze")
async def analyze_review(req: ReviewAnalyzeRequest):
    """Analyze conversations with harness-powered quality evaluation."""
    analyzer = ReviewAnalyzer()
    result = await analyzer.analyze(
        conversations=req.conversations,
        history=req.history,
        knowledge_context=req.knowledgeContext,
    )
    logger.info(
        f"Review analyzed: quality={result.get('quality', {}).get('score', 'N/A')}"
    )
    return {"success": True, "data": result}
