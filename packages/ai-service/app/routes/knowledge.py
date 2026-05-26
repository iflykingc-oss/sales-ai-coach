from fastapi import APIRouter
from pydantic import BaseModel
from app.services.knowledge_processor import (
    process_knowledge,
    merge_similar_knowledge,
    find_similar_items,
    adjust_weight,
)

router = APIRouter()


class KnowledgeProcessRequest(BaseModel):
    content: str
    source: str = ""


class KnowledgeMergeRequest(BaseModel):
    items: list[dict]
    threshold: float = 0.85


class KnowledgeSearchRequest(BaseModel):
    query: str
    items: list[dict]
    top_k: int = 5
    threshold: float = 0.5


class KnowledgeFeedbackRequest(BaseModel):
    current_weight: float = 1.0
    feedback: str  # "up" | "down" | "view" | "use"


@router.post("/process")
async def process_knowledge_item(req: KnowledgeProcessRequest):
    """Auto-tag and categorize a knowledge item with confidence scoring."""
    result = await process_knowledge(content=req.content, source=req.source)
    return {"success": True, "data": result}


@router.post("/merge")
async def merge_knowledge(req: KnowledgeMergeRequest):
    """Merge similar knowledge items using embedding-based semantic similarity."""
    result = await merge_similar_knowledge(items=req.items, threshold=req.threshold)
    return {"success": True, "data": result}


@router.post("/search")
async def search_similar(req: KnowledgeSearchRequest):
    """Find knowledge items similar to a query using embedding similarity."""
    results = await find_similar_items(
        query=req.query,
        items=req.items,
        top_k=req.top_k,
        threshold=req.threshold,
    )
    return {"success": True, "data": results}


@router.post("/feedback")
async def knowledge_feedback(req: KnowledgeFeedbackRequest):
    """Adjust knowledge weight based on user feedback."""
    new_weight = adjust_weight(
        current_weight=req.current_weight,
        feedback=req.feedback,
    )
    return {"success": True, "data": {"new_weight": new_weight}}
