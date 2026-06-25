"""
Evaluator Node — 评估销售表现

从 practice_harness.py 的 _evaluate_round() 提取，
改为 LangGraph 节点函数。使用与 PracticeHarness 相同的加权评估标准（evaluation_dimensions.py）。

注意：由于 START → stage_detector 和 START → persona 是 fan-out 并行，
persona 可能尚未完成。本节点通过 state.get("persona_response") 兜底处理。
"""

from app.models.router import model_router
from app.utils.json_parser import extract_json
from app.services.evaluation_dimensions import EVALUATION_RUBRIC, get_rubric_prompt_text, EVALUATION_DIMENSIONS
from app.core.logging import logger


async def evaluate(state: dict) -> dict:
    """Evaluate the salesperson's performance this round.

    Handles the fan-out race condition: if persona hasn't completed yet,
    persona_response may be missing — uses a safe fallback.

    Uses the unified EVALUATION_RUBRIC from evaluation_dimensions.py
    (same rubric as PracticeHarness) for consistent evaluation quality.

    Returns partial state update with performance_score, dimension_scores,
    eval_feedback, eval_issues.
    """
    user_input = state.get("user_input", "")

    # --- Fan-out race condition fix ---
    # persona runs in parallel with stage_detector from START.
    # If persona fails or is slow, persona_response may be missing.
    persona_response = state.get("persona_response")
    if not persona_response:
        persona_response = {"response": "I need a moment to think...", "emotion": "neutral"}
        logger.warning("[evaluator] persona_response missing (fan-out race), using fallback")

    emotion = state.get("persona_emotion", "中立")
    stage = state.get("stage", "")
    turn = state.get("turn_count", 0)
    messages = state.get("messages", [])
    industry = state.get("industry", "")
    logic_framework = state.get("logic_framework", "")

    # Skip evaluation for first 2 rounds (too little data)
    if turn < 2:
        return {
            "performance_score": 0.5,
            "dimension_scores": {d: 0.5 for d in EVALUATION_DIMENSIONS},
            "eval_feedback": "对话刚开始，继续深入。",
            "eval_issues": [],
        }

    # Build evaluation prompt using the unified rubric
    recent = messages[-6:] if len(messages) > 6 else messages
    recent_text = "\n".join(
        f"{'销售' if m.get('role') == 'user' else '客户'}: {m.get('content', '')[:150]}"
        for m in recent
    )

    # Use the same rubric text as PracticeHarness for consistent evaluation
    rubric_text = get_rubric_prompt_text()

    # Build persona response text (handle both str and dict fallback)
    if isinstance(persona_response, dict):
        resp_text = persona_response.get("response", str(persona_response))
    else:
        resp_text = str(persona_response)

    framework_eval = ""
    if logic_framework:
        framework_eval = f"""
逻辑框架评估:
销售当前使用的逻辑框架: {logic_framework}
请评估销售是否正确运用了该框架的核心逻辑。"""

    prompt = f"""你是一位资深销售教练，请按以下加权评估标准逐条评估销售代表的本轮表现。

对话记录:
{recent_text}

销售最新发言: {user_input}
客户回复: {resp_text}
客户情绪: {emotion}
当前阶段: {stage}
行业: {industry}{framework_eval}

评估标准（每个维度含子维度，每项 1-5 分）:
{rubric_text}

评分标准: 1=差 2=需改进 3=合格 4=良好 5=优秀

请严格输出以下JSON格式:
{{
  "overall_score": 0.65,
  "dimension_scores": {{
    "需求挖掘": {{
      "question_quality": {{"score": 3, "quote": "引用销售原话", "feedback": "具体评价"}},
      "listening_depth": {{"score": 4, "quote": "...", "feedback": "..."}},
      "need_identification": {{"score": 3, "quote": "...", "feedback": "..."}}
    }},
    "异议处理": {{ ... }},
    ...其余维度同上...
  }},
  "feedback": "一句话总体反馈",
  "issues": ["问题1", "问题2"]
}}

要求:
1. 每个子维度必须给出 score(1-5) 和 quote(引用原话)
2. issues 列出需要改进的具体问题（最多3个，按严重程度排序）
3. 如果整体表现良好（>4分），issues 可以为空
4. overall_score: 基于加权平均计算的 0-1 综合分"""

    try:
        result = await model_router.chat_with_fallback(
            [{"role": "user", "content": prompt}],
            temperature=0.2, max_tokens=800,
        )
        data = extract_json(result["content"])

        if data:
            raw_scores = data.get("dimension_scores", {})
            validated_scores = {}

            # Handle both flat scores and nested sub-dimension format
            # (same logic as PracticeHarness._evaluate_round)
            for dim in EVALUATION_DIMENSIONS:
                dim_data = raw_scores.get(dim)
                if dim_data is None:
                    validated_scores[dim] = 0.5
                elif isinstance(dim_data, (int, float)):
                    # Flat score (0-1 range)
                    validated_scores[dim] = max(0.0, min(1.0, float(dim_data)))
                elif isinstance(dim_data, dict):
                    # Nested sub-dimensions (1-5 range from rubric)
                    sub_scores = []
                    for sub_key, sub_data in dim_data.items():
                        if isinstance(sub_data, dict):
                            score = sub_data.get("score", 3)
                            sub_scores.append(max(1, min(5, int(score))) / 5.0)
                        elif isinstance(sub_data, (int, float)):
                            sub_scores.append(max(0, min(5, float(sub_data))) / 5.0)
                    validated_scores[dim] = sum(sub_scores) / len(sub_scores) if sub_scores else 0.5
                else:
                    validated_scores[dim] = 0.5

            overall = data.get("overall_score")
            if overall is None:
                # Compute from weighted average
                overall = sum(
                    validated_scores.get(d, 0.5) * EVALUATION_RUBRIC[d]["weight"]
                    for d in EVALUATION_DIMENSIONS
                )

            return {
                "performance_score": float(overall),
                "dimension_scores": validated_scores,
                "eval_feedback": data.get("feedback", ""),
                "eval_issues": data.get("issues", []),
            }

    except Exception as e:
        logger.warning(f"[evaluator] LLM evaluation failed: {e}")

    # Fallback: heuristic evaluation
    return _heuristic_evaluate(user_input, emotion)


def _heuristic_evaluate(user_input: str, emotion: str) -> dict:
    """Rule-based fallback evaluation using unified dimensions."""
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

    # Ensure all dimensions present
    for dim in EVALUATION_DIMENSIONS:
        if dim not in scores:
            scores[dim] = 0.5

    avg = sum(scores.values()) / len(scores)

    return {
        "performance_score": avg,
        "dimension_scores": scores,
        "eval_feedback": "继续练习，注意提问和价值传递。",
        "eval_issues": ["需要更多提问" if not has_question else ""],
    }
