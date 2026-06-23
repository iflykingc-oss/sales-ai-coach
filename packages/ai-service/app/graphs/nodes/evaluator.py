"""
Evaluator Node — 评估销售表现

从 practice_harness.py 的 _evaluate_round() 提取，
改为 LangGraph 节点函数。独立评估上下文，不受客户回复生成干扰。
"""

from app.models.router import model_router
from app.utils.json_parser import extract_json
from app.core.logging import logger

# 9 维评估维度
EVAL_DIMENSIONS = [
    "需求挖掘", "异议处理", "促单能力", "沟通表达",
    "情绪管理", "产品知识", "信任建立", "价值传递", "SPIN提问质量",
]


async def evaluate(state: dict) -> dict:
    """Evaluate the salesperson's performance this round.

    Returns partial state update with performance_score, dimension_scores,
    eval_feedback, eval_issues.
    """
    user_input = state.get("user_input", "")
    persona_response = state.get("persona_response", "")
    emotion = state.get("persona_emotion", "中立")
    stage = state.get("stage", "")
    turn = state.get("turn_count", 0)
    messages = state.get("messages", [])
    industry = state.get("industry", "")

    # Skip evaluation for first 2 rounds (too little data)
    if turn < 2:
        return {
            "performance_score": 0.5,
            "dimension_scores": {d: 0.5 for d in EVAL_DIMENSIONS},
            "eval_feedback": "对话刚开始，继续深入。",
            "eval_issues": [],
        }

    # Build evaluation prompt
    recent = messages[-6:] if len(messages) > 6 else messages
    recent_text = "\n".join(
        f"{'销售' if m.get('role') == 'user' else '客户'}: {m.get('content', '')[:150]}"
        for m in recent
    )

    dim_list = "\n".join(f"- {d}" for d in EVAL_DIMENSIONS)

    prompt = f"""你是一个严格的销售教练。评估以下销售对话中销售的表现。

对话记录:
{recent_text}

销售最新发言: {user_input}
客户回复: {persona_response}
客户情绪: {emotion}
当前阶段: {stage}
行业: {industry}

评估维度（每项 0-1 分）:
{dim_list}

请严格按照以下JSON格式输出:
{{
  "overall_score": 0.65,
  "dimension_scores": {{
    "需求挖掘": 0.7,
    "异议处理": 0.5,
    "促单能力": 0.6,
    "沟通表达": 0.8,
    "情绪管理": 0.7,
    "产品知识": 0.6,
    "信任建立": 0.5,
    "价值传递": 0.6,
    "SPIN提问质量": 0.4
  }},
  "feedback": "具体反馈",
  "issues": ["问题1", "问题2"]
}}

注意:
1. 评分要严格客观
2. feedback 要具体指出做得好和不好的地方
3. issues 列出需要改进的具体问题（最多3个）
4. 如果整体表现良好（>0.7），issues 可以为空"""

    try:
        result = await model_router.chat_with_fallback(
            [{"role": "user", "content": prompt}],
            temperature=0.2, max_tokens=500,
        )
        data = extract_json(result["content"])

        if data:
            scores = data.get("dimension_scores", {})
            # Validate all dimensions present
            for dim in EVAL_DIMENSIONS:
                if dim not in scores:
                    scores[dim] = 0.5

            return {
                "performance_score": float(data.get("overall_score", 0.5)),
                "dimension_scores": scores,
                "eval_feedback": data.get("feedback", ""),
                "eval_issues": data.get("issues", []),
            }

    except Exception as e:
        logger.warning(f"[evaluator] LLM evaluation failed: {e}")

    # Fallback: heuristic evaluation
    return _heuristic_evaluate(user_input, emotion)


def _heuristic_evaluate(user_input: str, emotion: str) -> dict:
    """Rule-based fallback evaluation."""
    text = user_input.lower()
    scores = {}

    # Question density
    has_question = "?" in text or "？" in text
    scores["需求挖掘"] = 0.7 if has_question else 0.4
    scores["SPIN提问质量"] = 0.6 if has_question else 0.3

    # Empathy markers
    empathy_words = ["理解", "明白", "确实", "我也觉得", "感受"]
    has_empathy = any(w in text for w in empathy_words)
    scores["情绪管理"] = 0.7 if has_empathy else 0.4
    scores["信任建立"] = 0.6 if has_empathy else 0.4

    # Value proposition
    value_words = ["价值", "效果", "收益", "提升", "降低", "节省", "优势"]
    has_value = any(w in text for w in value_words)
    scores["价值传递"] = 0.7 if has_value else 0.4
    scores["产品知识"] = 0.6 if has_value else 0.4

    # Objection handling
    if emotion in ["抗拒", "生气"]:
        objection_words = ["理解", "但是", "不过", "其实", "换个角度"]
        scores["异议处理"] = 0.7 if any(w in text for w in objection_words) else 0.3
    else:
        scores["异议处理"] = 0.5

    # Default
    scores["促单能力"] = 0.4
    scores["沟通表达"] = 0.6 if len(text) > 20 else 0.3

    avg = sum(scores.values()) / len(scores)

    return {
        "performance_score": avg,
        "dimension_scores": scores,
        "eval_feedback": "继续练习，注意提问和价值传递。",
        "eval_issues": ["需要更多提问" if not has_question else ""],
    }
