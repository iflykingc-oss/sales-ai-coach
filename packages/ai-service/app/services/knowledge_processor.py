from app.models.router import model_router
from app.core.logging import logger
import json

KNOWLEDGE_TAG_PROMPT = """你是一个销售知识分类专家。请分析以下知识内容并自动打标。

输出JSON格式：
{"tags": ["场景标签", "客户类型标签", "异议类型标签"], "category": "销售技巧库|产品知识库|行业知识库|异议处理库"}

知识内容：
{text}"""


async def process_knowledge(content: str, source: str = "") -> dict:
    """Auto-tag and categorize knowledge items."""
    messages = [
        {"role": "system", "content": KNOWLEDGE_TAG_PROMPT.format(text=content[:2000])},
        {"role": "user", "content": "请分析并打标"},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=256)

    try:
        parsed = json.loads(result["content"])
        return {
            "tags": parsed.get("tags", []),
            "category": parsed.get("category", "销售技巧库"),
        }
    except json.JSONDecodeError:
        return {"tags": ["待分类"], "category": "销售技巧库"}


async def merge_similar_knowledge(items: list[dict], threshold: float = 0.85) -> list[dict]:
    """Merge similar knowledge items based on content similarity."""
    if len(items) < 2:
        return items

    merged = []
    used = set()

    for i, item in enumerate(items):
        if i in used:
            continue
        similar = [item]
        for j, other in enumerate(items):
            if j <= i or j in used:
                continue
            if _content_similarity(item["content"], other["content"]) > threshold:
                similar.append(other)
                used.add(j)

        if len(similar) > 1:
            merged_item = {
                **similar[0],
                "content": "\n---\n".join(s["content"] for s in similar),
                "weight": sum(s.get("weight", 1.0) for s in similar),
            }
            merged.append(merged_item)
        else:
            merged.append(item)

    return merged


def _content_similarity(a: str, b: str) -> float:
    """Simple Jaccard similarity for text comparison."""
    set_a = set(a.lower().split())
    set_b = set(b.lower().split())
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)
