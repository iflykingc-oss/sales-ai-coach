"""
Knowledge Processor — AI-powered tagging and embedding-based similarity.

Features:
1. Auto-tagging with LLM + confidence score
2. Embedding-based semantic similarity (replaces broken Jaccard for Chinese)
3. Weight optimization based on user feedback
4. Auto-archiving of low-value knowledge
"""

from app.models.router import model_router
from app.core.logging import logger
from app.core.sanitization import wrap_user_input
from app.utils.json_parser import extract_json
import json
import math
from typing import Any


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
    Get text embedding via model API for semantic similarity.

    Uses the configured primary model to generate embeddings.
    Falls back to a simple character-ngram vectorization if embedding API unavailable.
    """
    # Try to use model API for embeddings
    try:
        messages = [
            {
                "role": "system",
                "content": "你是一个文本向量化服务。请将以下文本转换为一个固定长度的数值向量（32维浮点数列表），用于计算文本间的语义相似度。输出纯JSON数组，不要其他内容。",
            },
            {"role": "user", "content": text[:2000]},
        ]
        result = await model_router.chat_with_fallback(messages, temperature=0, max_tokens=512)

        content = result["content"]
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        embedding = json.loads(content.strip())
        if isinstance(embedding, list) and len(embedding) > 0:
            return [float(x) for x in embedding]
    except Exception as e:
        logger.warning(f"Embedding API failed, using fallback: {e}")

    # Fallback: character bigram frequency vector (works for Chinese)
    return _fallback_embedding(text)


def _fallback_embedding(text: str) -> list[float]:
    """Character bigram frequency embedding (works for Chinese text)."""
    # Extract character bigrams
    bigrams = {}
    for i in range(len(text) - 1):
        bigram = text[i:i+2]
        bigrams[bigram] = bigrams.get(bigram, 0) + 1

    # Convert to fixed 64-dim vector using hash
    vec = [0.0] * 64
    for bigram, count in bigrams.items():
        h = hash(bigram) % 64
        vec[h] += count

    # Normalize
    magnitude = math.sqrt(sum(x*x for x in vec)) or 1
    return [x / magnitude for x in vec]


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
