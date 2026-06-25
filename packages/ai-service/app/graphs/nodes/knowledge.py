"""
Knowledge Node — 知识补全

当教练识别到知识缺口时，从 knowledge_context 中检索相关知识并推荐。
knowledge_context 由 orchestrator 在 init_session 时注入 graph state。
"""

import re

from app.models.router import model_router
from app.utils.json_parser import extract_json
from app.core.logging import logger

# Dimension → search keywords for knowledge context lookup
_DIMENSION_KEYWORDS = {
    "需求挖掘": ["需求", "提问", "SPIN", "痛点", "发现", "挖掘"],
    "异议处理": ["异议", "反对", "顾虑", "LAER", "化解", "抗拒"],
    "促单能力": ["成交", "促单", "签约", "BANT", "推进", "收尾"],
    "价值传递": ["价值", "FAB", "ROI", "收益", "利益", "卖点"],
    "信任建立": ["信任", "案例", "口碑", "背书", "信誉"],
    "沟通表达": ["沟通", "表达", "话术", "措辞"],
    "情绪管理": ["情绪", "压力", "应对", "冷静"],
    "产品知识": ["产品", "功能", "特性", "竞品", "对比"],
    "SPIN提问质量": ["SPIN", "情境", "暗示", "效益"],
}


def _search_knowledge_context(knowledge_context: str, dimension: str, gap: str = "") -> list[dict]:
    """Search knowledge_context for snippets relevant to the dimension/gap.

    Returns up to 3 knowledge snippets as structured dicts.
    """
    if not knowledge_context:
        return []

    # Split knowledge context into chunks (by paragraph or numbered items)
    chunks = re.split(r'\n{2,}|\n(?=\d+[.、])|\n(?=-\s)', knowledge_context)
    chunks = [c.strip() for c in chunks if len(c.strip()) > 15]

    if not chunks:
        return []

    # Score each chunk by keyword overlap
    keywords = _DIMENSION_KEYWORDS.get(dimension, [dimension])
    if gap:
        keywords = keywords + [gap]

    scored = []
    for chunk in chunks:
        score = sum(1 for kw in keywords if kw in chunk)
        if gap and gap in chunk:
            score += 3  # Boost exact gap match
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: -x[0])

    results = []
    for _, chunk in scored[:3]:
        # Truncate long chunks
        snippet = chunk[:300] + ("..." if len(chunk) > 300 else "")
        results.append({
            "title": snippet[:50].split("\n")[0].strip(),
            "type": "knowledge_context",
            "description": snippet,
            "dimension": dimension,
            "source": "knowledge_context",
        })

    return results


async def _llm_suggest(knowledge_context: str, dimension: str, gap: str, industry: str) -> list[dict]:
    """Use LLM to find relevant knowledge when keyword search yields nothing."""
    prompt = f"""从以下知识库内容中，找出与「{dimension}」维度相关的知识片段。

知识库:
{knowledge_context[:3000]}

{f'知识缺口: {gap}' if gap else ''}
行业: {industry or '通用'}

请输出JSON数组，每项包含 title, description（50字以内）:
[{{"title": "...", "description": "..."}}, ...]

如果知识库中没有相关内容，输出空数组 []。"""

    try:
        result = await model_router.chat_with_fallback(
            [{"role": "user", "content": prompt}],
            temperature=0.2, max_tokens=300,
        )
        data = extract_json(result["content"])
        if isinstance(data, list):
            return [
                {
                    "title": item.get("title", ""),
                    "type": "knowledge_context",
                    "description": item.get("description", ""),
                    "dimension": dimension,
                    "source": "knowledge_context_llm",
                }
                for item in data[:3]
                if item.get("title")
            ]
    except Exception as e:
        logger.warning(f"[knowledge] LLM suggest failed: {e}")

    return []


async def suggest(state: dict) -> dict:
    """Suggest knowledge resources based on coaching interventions.

    Searches knowledge_context (from state) for relevant items matching
    the weak dimension identified by the coach node.

    Returns partial state update with knowledge_suggestions (auto-appended).
    """
    interventions = state.get("coaching_interventions", [])
    knowledge_context = state.get("knowledge_context", "")
    industry = state.get("industry", "")

    if not interventions:
        return {"knowledge_suggestions": []}

    latest = interventions[-1]
    gap = latest.get("knowledge_gap")
    dimension = latest.get("dimension", "")

    suggestions = []

    # 1. Search knowledge_context with keyword matching
    context_suggestions = _search_knowledge_context(knowledge_context, dimension, gap or "")
    suggestions.extend(context_suggestions)

    # 2. If keyword search found nothing and we have context, try LLM search
    if not suggestions and knowledge_context:
        llm_suggestions = await _llm_suggest(knowledge_context, dimension, gap or "", industry)
        suggestions.extend(llm_suggestions)

    # 3. Add gap-specific suggestion if the coach identified one
    if gap:
        suggestions.append({
            "title": f"补充知识：{gap}",
            "type": "gap",
            "description": f"建议学习「{gap}」相关知识",
            "dimension": dimension,
            "source": "coach_recommendation",
        })

    if suggestions:
        logger.info(f"[knowledge] Suggested {len(suggestions)} resources for {dimension}")

    return {"knowledge_suggestions": suggestions}
