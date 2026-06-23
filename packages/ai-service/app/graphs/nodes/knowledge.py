"""
Knowledge Node — 知识补全

当教练识别到知识缺口时，检索相关知识并推荐。
"""

from app.core.logging import logger


async def suggest(state: dict) -> dict:
    """Suggest knowledge resources based on coaching interventions.

    Returns partial state update with knowledge_suggestions (auto-appended).
    """
    interventions = state.get("coaching_interventions", [])
    industry = state.get("industry", "")
    dimension_scores = state.get("dimension_scores", {})

    if not interventions:
        return {"knowledge_suggestions": []}

    latest = interventions[-1]
    gap = latest.get("knowledge_gap")
    dimension = latest.get("dimension", "")

    suggestions = []

    # Knowledge recommendations based on weak dimension
    dimension_resources = {
        "需求挖掘": [
            {"title": "SPIN 提问技巧", "type": "framework", "description": "Situation→Problem→Implication→Need-payoff 四步提问法"},
            {"title": "需求发现五步法", "type": "technique", "description": "通过观察、提问、倾听、确认、记录五步发现真实需求"},
        ],
        "异议处理": [
            {"title": "LAER 异议化解法", "type": "framework", "description": "Listen→Acknowledge→Explore→Respond 四步异议处理"},
            {"title": "常见异议应对话术库", "type": "knowledge", "description": "价格、时机、信任、竞品等异议的标准应对"},
        ],
        "促单能力": [
            {"title": "成交五步推进法", "type": "framework", "description": "试探→确认→假设成交→紧迫感→最终收尾"},
            {"title": "BANT 线索判定", "type": "framework", "description": "Budget→Authority→Need→Timeline 四维线索评分"},
        ],
        "价值传递": [
            {"title": "FAB 利益展示法", "type": "framework", "description": "Feature→Advantage→Benefit 三层价值传递"},
            {"title": "ROI 量化计算", "type": "technique", "description": "用具体数字展示投资回报"},
        ],
        "信任建立": [
            {"title": "信任建立五要素", "type": "technique", "description": "专业性、可靠性、亲和力、客户导向、长期关系"},
            {"title": "案例故事法", "type": "technique", "description": "用客户成功案例建立信任"},
        ],
    }

    # Get resources for the weakest dimension
    resources = dimension_resources.get(dimension, [])
    for r in resources[:2]:
        suggestions.append({
            "title": r["title"],
            "type": r["type"],
            "description": r["description"],
            "dimension": dimension,
            "source": "knowledge_base",
        })

    # Add gap-specific suggestion if present
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
