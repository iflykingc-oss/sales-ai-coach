from fastapi import APIRouter
from pydantic import BaseModel
from app.services.knowledge_processor import process_knowledge, merge_similar_knowledge

router = APIRouter()


class KnowledgeProcessRequest(BaseModel):
    content: str
    source: str = ""


class KnowledgeMergeRequest(BaseModel):
    items: list[dict]
    threshold: float = 0.85


@router.post("/process")
async def process_knowledge_item(req: KnowledgeProcessRequest):
    """Auto-tag and categorize a knowledge item."""
    result = await process_knowledge(content=req.content, source=req.source)
    return {"success": True, "data": result}


@router.post("/merge")
async def merge_knowledge(req: KnowledgeMergeRequest):
    """Merge similar knowledge items."""
    result = await merge_similar_knowledge(items=req.items, threshold=req.threshold)
    return {"success": True, "data": result}
