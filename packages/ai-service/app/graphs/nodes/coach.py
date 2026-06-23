"""
Coach Node — 教练干预决策

当评估结果表明需要干预时，生成教练提示。
条件路由由 coaching_graph.py 的 should_intervene() 控制。
"""

from app.models.router import model_router
from app.utils.json_parser import extract_json
from app.core.logging import logger


async def intervene(state: dict) -> dict:
    """Generate coaching intervention based on evaluation results.

    Returns partial state update with coaching_interventions (auto-appended).
    """
    score = state.get("performance_score", 0.5)
    dimension_scores = state.get("dimension_scores", {})
    issues = state.get("eval_issues", [])
    stage = state.get("stage", "")
    emotion = state.get("persona_emotion", "中立")
    turn = state.get("turn_count", 0)
    user_input = state.get("user_input", "")
    persona_response = state.get("persona_response", "")

    # Find weakest dimension
    weakest_dim = min(dimension_scores, key=dimension_scores.get) if dimension_scores else "沟通表达"
    weakest_score = dimension_scores.get(weakest_dim, 0.5)

    # Build coaching prompt
    issues_text = "\n".join(f"- {i}" for i in issues if i) or "无明显问题"

    prompt = f"""你是一个资深销售教练。根据以下评估结果，给出简短、具体、可执行的教练提示。

评估结果:
- 整体评分: {score:.1f}/1.0
- 最弱维度: {weakest_dim}（{weakest_score:.1f}分）
- 客户情绪: {emotion}
- 当前阶段: {stage}
- 发现的问题:
{issues_text}

销售最新发言: {user_input[:200]}
客户回复: {persona_response[:200]}

请给出:
1. 一个具体的改进建议（20-50字）
2. 如果有知识缺口，指出需要补充什么知识

输出JSON:
{{
  "hint": "具体的教练提示",
  "dimension": "最需要改进的维度",
  "score": 0.5,
  "knowledge_gap": null 或 "需要补充的知识领域"
}}"""

    try:
        result = await model_router.chat_with_fallback(
            [{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=200,
        )
        data = extract_json(result["content"])

        if data:
            intervention = {
                "hint": data.get("hint", ""),
                "dimension": data.get("dimension", weakest_dim),
                "score": score,
                "knowledge_gap": data.get("knowledge_gap"),
                "turn": turn,
            }
            return {
                "coaching_interventions": [intervention],
                "should_intervene": True,
            }

    except Exception as e:
        logger.warning(f"[coach] LLM coaching failed: {e}")

    # Fallback: rule-based coaching
    return _rule_based_coaching(weakest_dim, weakest_score, score, turn)


def _rule_based_coaching(
    weakest_dim: str, weakest_score: float, overall_score: float, turn: int
) -> dict:
    """Generate coaching hint based on rules."""
    hints = {
        "需求挖掘": "多用开放式问题了解客户需求，比如'目前最大的挑战是什么？'",
        "异议处理": "先认同客户顾虑，再用数据或案例化解，避免直接反驳。",
        "促单能力": "适当制造紧迫感，明确下一步行动，比如'我们下周安排个演示？'",
        "沟通表达": "语言更简洁有力，用数据和案例支撑观点。",
        "情绪管理": "保持冷静专业，即使客户态度不好也不要情绪化。",
        "产品知识": "深入了解产品核心卖点和竞品差异，准备充分的案例。",
        "信任建立": "多倾听，展示专业性，用客户成功案例建立信任。",
        "价值传递": "将产品功能转化为客户能感知的具体价值和收益。",
        "SPIN提问质量": "按 Situation→Problem→Implication→Need-payoff 顺序提问。",
    }

    hint = hints.get(weakest_dim, "继续加油，注意观察客户反应。")

    intervention = {
        "hint": hint,
        "dimension": weakest_dim,
        "score": overall_score,
        "knowledge_gap": None,
        "turn": turn,
    }

    return {
        "coaching_interventions": [intervention],
        "should_intervene": True,
    }
