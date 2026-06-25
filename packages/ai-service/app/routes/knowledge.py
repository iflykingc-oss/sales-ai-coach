from fastapi import APIRouter
from pydantic import BaseModel
from app.services.knowledge_processor import (
    process_knowledge,
    merge_similar_knowledge,
    find_similar_items,
    adjust_weight,
)
from app.services.embedding_service import embedding_service

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


class EmbeddingRequest(BaseModel):
    text: str


class EmbeddingBatchRequest(BaseModel):
    texts: list[str]


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


@router.post("/embedding")
async def get_embedding(req: EmbeddingRequest):
    """Get embedding vector for a single text. Used by API for pgvector storage/search.

    Returns the embedding normalized to EMBEDDING_DIM (1024) for pgvector compatibility.
    """
    embedding = await embedding_service.embed_for_storage(req.text)
    return {"success": True, "data": {"embedding": embedding, "dimension": len(embedding)}}


@router.post("/embedding/batch")
async def get_embedding_batch(req: EmbeddingBatchRequest):
    """Get embedding vectors for multiple texts in a single call.

    Max 25 texts per batch (DashScope limit). Returns vectors normalized to EMBEDDING_DIM.
    """
    if len(req.texts) > 25:
        return {"success": False, "error": "Max 25 texts per batch"}
    raw_embeddings = await embedding_service.embed_batch(req.texts)
    embeddings = [embedding_service._normalize_dim(emb) for emb in raw_embeddings]
    return {"success": True, "data": {"embeddings": embeddings, "dimension": len(embeddings[0]) if embeddings else 0}}


@router.post("/feedback")
async def knowledge_feedback(req: KnowledgeFeedbackRequest):
    """Adjust knowledge weight based on user feedback."""
    new_weight = adjust_weight(
        current_weight=req.current_weight,
        feedback=req.feedback,
    )
    return {"success": True, "data": {"new_weight": new_weight}}
