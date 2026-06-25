"""
Knowledge Processor — AI-powered tagging and embedding-based similarity.

Features:
1. Auto-tagging with LLM + confidence score
2. Embedding-based semantic similarity (replaces broken Jaccard for Chinese)
3. Weight optimization based on user feedback
4. Auto-archiving of low-value knowledge
5. Structured four-dimensional knowledge parsing (scene/strategy/example/id)
6. Strategy-level semantic deduplication
"""

from app.models.router import model_router
from app.core.logging import logger
from app.core.sanitization import wrap_user_input
from app.utils.json_parser import extract_json
from app.config.speech_config import SpeechGenConfig, DEFAULT_CONFIG
import json
import math
import re
from typing import Any, List


KNOWLEDGE_TAG_PROMPT = """你是一个销售知识分类专家。请分析以下知识内容并自动打标。

输出JSON格式：
{{
  "tags": ["场景标签", "客户类型标签", "异议类型标签"],
  "category": "销售技巧库|产品知识库|行业知识库|异议处理库",
  "confidence": 0.85,
  "summary": "一句话概括此知识的核心价值"
}}

知识内容：
{text}"""


async def process_knowledge(content: str, source: str = "") -> dict:
    """Auto-tag and categorize knowledge items with confidence scoring."""
    messages = [
        {"role": "system", "content": KNOWLEDGE_TAG_PROMPT.format(text=wrap_user_input(content[:3000]))},
        {"role": "user", "content": "请分析并打标"},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=512)

    try:
        parsed = extract_json(result["content"])
        if parsed is None:
            raise ValueError("No valid JSON found")
        return {
            "tags": parsed.get("tags", []),
            "category": parsed.get("category", "销售技巧库"),
            "confidence": parsed.get("confidence", 0.7),
            "summary": parsed.get("summary", content[:100]),
        }
    except (json.JSONDecodeError, ValueError):
        return {
            "tags": ["待分类"],
            "category": "销售技巧库",
            "confidence": 0.3,
            "summary": content[:100],
        }


async def get_text_embedding(text: str) -> list[float]:
    """
    Get text embedding via DashScope embedding API.

    Uses the embedding_service which handles:
    1. DashScope text-embedding-v3 (primary, 1024-dim)
    2. Character bigram fallback (64-dim, no API needed)
    """
    from app.services.embedding_service import embedding_service
    return await embedding_service.embed(text)


async def get_text_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Get embeddings for multiple texts in a single batch call.

    Much more efficient than individual calls for N > 1.
    DashScope supports up to 25 texts per batch.
    """
    from app.services.embedding_service import embedding_service
    return await embedding_service.embed_batch(texts)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(a) != len(b):
        # Pad shorter vector
        max_len = max(len(a), len(b))
        a = a + [0.0] * (max_len - len(a))
        b = b + [0.0] * (max_len - len(b))

    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x*x for x in a))
    mag_b = math.sqrt(sum(x*x for x in b))

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot / (mag_a * mag_b)


async def merge_similar_knowledge(items: list[dict], threshold: float = 0.85) -> list[dict]:
    """
    Merge similar knowledge items using embedding-based semantic similarity.

    Pipeline:
    1. Get embeddings for all items (batched)
    2. Compute pairwise cosine similarity
    3. Group items above threshold
    4. Merge groups
    """
    if len(items) < 2:
        return items

    # Get embeddings for all items
    embeddings = []
    for item in items:
        emb = await get_text_embedding(item.get("content", ""))
        embeddings.append(emb)

    # Compute pairwise similarity and merge
    merged = []
    used = set()

    for i, item in enumerate(items):
        if i in used:
            continue

        similar = [item]
        for j, other in enumerate(items):
            if j <= i or j in used:
                continue

            sim = cosine_similarity(embeddings[i], embeddings[j])
            if sim > threshold:
                similar.append(other)
                used.add(j)

        if len(similar) > 1:
            # Merge: keep first item's metadata, concatenate content, sum weights
            merged_item = {
                **similar[0],
                "content": "\n--- (合并自相似条目) ---\n".join(
                    s.get("content", "") for s in similar
                ),
                "weight": sum(s.get("weight", 1.0) for s in similar),
                "merged_count": len(similar),
            }
            merged.append(merged_item)
            logger.info(f"Merged {len(similar)} similar knowledge items (threshold={threshold})")
        else:
            merged.append(item)

    return merged


async def find_similar_items(
    query: str,
    items: list[dict],
    top_k: int = 5,
    threshold: float = 0.5,
) -> list[dict[str, Any]]:
    """
    Find items similar to a query using embedding-based similarity.

    Returns: [{"item": dict, "score": float}, ...]
    """
    if not items:
        return []

    query_emb = await get_text_embedding(query)
    results = []

    for item in items:
        item_emb = await get_text_embedding(item.get("content", ""))
        sim = cosine_similarity(query_emb, item_emb)
        if sim >= threshold:
            results.append({"item": item, "score": round(sim, 4)})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def adjust_weight(current_weight: float, feedback: str, learning_rate: float = 0.1) -> float:
    """
    Adjust knowledge weight based on user feedback.

    feedback: "up" | "down" | "view" | "use"
    """
    adjustments = {
        "up": 0.15,
        "down": -0.2,
        "view": 0.02,
        "use": 0.1,
    }
    delta = adjustments.get(feedback, 0)
    new_weight = current_weight + delta * learning_rate
    return max(0.0, min(1.0, new_weight))


def should_archive(weight: float, usage_count: int, days_since_update: int) -> bool:
    """
    Determine if a knowledge item should be archived.

    Criteria:
    - Weight below 0.3
    - No usage in 90+ days
    - Low usage count (< 3)
    """
    return weight < 0.3 and usage_count < 3 and days_since_update > 90


# =============================================================================
# Structured Knowledge Processing — four-dimensional parsing + strategy dedup
# =============================================================================

class KnowledgeItem:
    """Structured knowledge entry with four-dimensional indexing."""

    def __init__(
        self,
        kn_id: str,
        industry: str,
        scene: str,
        strategy: str,
        example: str,
        score: float = 0.0,
    ):
        self.id = kn_id
        self.industry = industry
        self.scene = scene
        self.strategy = strategy
        self.example = example
        self.score = score

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "industry": self.industry,
            "scene": self.scene,
            "strategy": self.strategy,
            "example": self.example,
            "score": self.score,
        }

    def __repr__(self) -> str:
        return f"KnowledgeItem(id={self.id}, scene={self.scene}, strategy={self.strategy[:30]}...)"


class KnowledgeProcessor:
    """
    Structured knowledge processing pipeline.

    Pipeline: raw text → four-dimensional parse → strategy-level dedup → top-K selection
    Uses existing embedding functions for semantic similarity, falls back to bigram.
    """

    def __init__(self, config: SpeechGenConfig = DEFAULT_CONFIG):
        self.config = config

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize text: remove whitespace, punctuation, unify format."""
        return re.sub(
            r'[\s，。！？、；：""\'\'（）\[\]【】\.,;:"\'()\n\r]',
            '',
            text,
        ).lower()

    @staticmethod
    def _bigram_similarity(a: str, b: str) -> float:
        """Bigram Jaccard similarity as fallback when embedding unavailable."""
        a_norm = KnowledgeProcessor._normalize_text(a)
        b_norm = KnowledgeProcessor._normalize_text(b)
        if not a_norm or not b_norm:
            return 0.0

        bg_a = {a_norm[i:i + 2] for i in range(len(a_norm) - 1)}
        bg_b = {b_norm[i:i + 2] for i in range(len(b_norm) - 1)}
        intersection = len(bg_a & bg_b)
        union = len(bg_a | bg_b)
        return intersection / union if union > 0 else 0.0

    async def _calc_similarity(self, text_a: str, text_b: str) -> float:
        """
        Two-tier similarity: prefer embedding, fall back to bigram.

        Reuses existing get_text_embedding() and cosine_similarity() functions.
        """
        try:
            emb_a = await get_text_embedding(text_a)
            emb_b = await get_text_embedding(text_b)
            return cosine_similarity(emb_a, emb_b)
        except Exception as e:
            logger.warning(f"Embedding similarity failed, falling back to bigram: {e}")
            return self._bigram_similarity(text_a, text_b)

    @staticmethod
    def _parse_raw_item(raw_text: str, index: int, industry: str) -> KnowledgeItem:
        """
        Parse unstructured knowledge text into four-dimensional structure.

        Adapted to existing knowledge base format. Handles multiple common patterns:
        - 客户说"..." → scene
        - 应对策略：... → strategy
        - （"..."） → example
        """
        scene_match = re.search(r'客户说[““]([^””]+)[“”]', raw_text)
        strategy_match = re.search(r'应对策略[：:]([^\n]+)', raw_text)
        example_match = re.search(r'[（(][““]([^””]+)[“”][）)]', raw_text)

        # Fallback patterns for different knowledge formats
        if not scene_match:
            scene_match = re.search(r'场景[：:]([^\n]+)', raw_text)
        if not strategy_match:
            strategy_match = re.search(r'策略[：:]([^\n]+)', raw_text)
        if not example_match:
            example_match = re.search(r'示例[：:]([^\n]+)', raw_text)

        return KnowledgeItem(
            kn_id=f"kn_{industry}_{index}_{abs(hash(raw_text)) % 10000:04d}",
            industry=industry,
            scene=scene_match.group(1).strip() if scene_match else "通用异议",
            strategy=strategy_match.group(1).split('（')[0].strip() if strategy_match else raw_text[:100],
            example=example_match.group(1).strip() if example_match else "",
            score=0.0,
        )

    async def process(
        self,
        raw_knowledge_list: List[str],
        industry: str,
        top_k: int = 3,
    ) -> List[KnowledgeItem]:
        """
        Knowledge processing pipeline: parse → strategy dedup → top-K.

        Args:
            raw_knowledge_list: Raw knowledge text entries
            industry: Industry identifier
            top_k: Number of items to return

        Returns:
            Deduplicated top-K KnowledgeItem list
        """
        if not raw_knowledge_list:
            return []

        # Step 1: Structured parsing
        parsed_items = [
            self._parse_raw_item(raw, idx, industry)
            for idx, raw in enumerate(raw_knowledge_list)
        ]

        # Step 2: Strategy-level semantic dedup (core: prevent same strategy repeated)
        deduped: List[KnowledgeItem] = []
        seen_strategies: List[str] = []

        for item in parsed_items:
            is_dup = False
            for seen in seen_strategies:
                sim = await self._calc_similarity(item.strategy, seen)
                if sim >= self.config.dedup_similarity_threshold:
                    logger.info(
                        f"Dedup: '{item.strategy[:30]}...' ~= '{seen[:30]}...' (sim={sim:.3f})"
                    )
                    is_dup = True
                    break
            if not is_dup:
                seen_strategies.append(item.strategy)
                deduped.append(item)

        # Step 3: Return top-K
        result = deduped[:top_k]
        logger.info(
            f"Knowledge processed: {len(raw_knowledge_list)} raw → "
            f"{len(parsed_items)} parsed → {len(deduped)} deduped → {len(result)} returned"
        )
        return result
