"""
Persona Node — 生成客户回复

从 practice_harness.py 的 _build_customer_system_prompt() 和
_generate_customer_response() 提取，改为 LangGraph 节点。
"""

import json
from app.models.router import model_router
from app.core.sanitization import wrap_user_input
from app.core.logging import logger
from app.utils.json_parser import extract_json

# 情绪范围
EMOTIONS = ["中立", "感兴趣", "犹豫", "抗拒", "敷衍", "满意", "生气", "共情"]

# 情绪升级路径
EMOTION_PROGRESSION = {
    "生气": ["抗拒", "犹豫"],
    "抗拒": ["犹豫", "中立"],
    "犹豫": ["中立", "感兴趣"],
    "中立": ["感兴趣", "共情"],
    "感兴趣": ["满意", "共情"],
    "敷衍": ["中立", "抗拒"],
    "满意": ["满意", "共情"],
    "共情": ["满意", "感兴趣"],
}


async def respond(state: dict) -> dict:
    """Generate customer persona response.

    Returns partial state update with persona_response, persona_emotion, and appended message.
    """
    user_input = state.get("user_input", "")
    persona_json = state.get("customer_persona", "{}")
    emotion = state.get("persona_emotion", "中立")
    stage = state.get("stage", "")
    stage_tip = state.get("stage_coaching_tip", "")
    difficulty = state.get("difficulty", "medium")
    framework = state.get("logic_framework", "")
    messages = state.get("messages", [])
    industry = state.get("industry", "")

    # Parse persona
    try:
        persona = json.loads(persona_json) if isinstance(persona_json, str) else persona_json
    except (json.JSONDecodeError, TypeError):
        persona = {"name": "王总", "role": "采购负责人", "personality": "理性"}

    # Build system prompt
    system_prompt = _build_system_prompt(
        persona, emotion, stage, stage_tip, difficulty, framework, industry
    )

    # Build messages
    llm_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"销售说: {wrap_user_input(user_input)}"},
    ]

    # Add conversation history (last 6 messages)
    for msg in messages[-6:]:
        role = msg.get("role", "user")
        if role in ("user", "assistant"):
            llm_messages.insert(-1, {
                "role": "user" if role == "user" else "assistant",
                "content": msg.get("content", "")[:200],
            })

    try:
        result = await model_router.chat_with_fallback(
            llm_messages, temperature=0.8, max_tokens=256
        )
        content = result["content"]

        # Parse emotion from response
        detected_emotion = _parse_emotion(content, emotion)

        # Clean response (remove emotion tag)
        clean_response = content.split("[emotion:")[0].strip()

        return {
            "persona_response": clean_response,
            "persona_emotion": detected_emotion,
            "messages": [{"role": "assistant", "content": clean_response}],
        }

    except Exception as e:
        logger.error(f"[persona] LLM call failed: {e}")
        # Fallback response
        fallback = "嗯，你说的我听到了，能再详细说说吗？"
        return {
            "persona_response": fallback,
            "persona_emotion": "中立",
            "messages": [{"role": "assistant", "content": fallback}],
        }


def _build_system_prompt(
    persona: dict, emotion: str, stage: str, stage_tip: str,
    difficulty: str, framework: str, industry: str,
) -> str:
    """Build the customer persona system prompt."""

    # Difficulty configs
    difficulty_configs = {
        "easy": {"objection_frequency": 0.15, "convince_resistance": 0.20, "patience_rounds": 12},
        "medium": {"objection_frequency": 0.35, "convince_resistance": 0.50, "patience_rounds": 8},
        "hard": {"objection_frequency": 0.55, "convince_resistance": 0.70, "patience_rounds": 6},
        "expert": {"objection_frequency": 0.70, "convince_resistance": 0.90, "patience_rounds": 5},
    }
    config = difficulty_configs.get(difficulty, difficulty_configs["medium"])

    # Stage context
    stage_context = ""
    if stage and stage_tip:
        stage_context = f"\n当前销售阶段: {stage} — {stage_tip}"

    # Framework context
    framework_context = ""
    if framework:
        framework_context = f"\n销售正在使用「{framework}」框架。{stage_context}"

    return f"""你正在扮演一个客户角色，与销售进行对话。

客户画像:
- 姓名: {persona.get('name', '王总')}
- 职位: {persona.get('role', '采购负责人')}
- 公司: {persona.get('company', '某公司')}
- 性格: {persona.get('personality', '理性')}
- 需求: {persona.get('needs', '待确认')}
- 痛点: {persona.get('pain_points', '待确认')}
- 态度: {persona.get('attitude', '观望')}
- 异议风格: {persona.get('objection_style', '一般')}

当前情绪: {emotion}
难度配置:
- 异议频率: {config['objection_frequency']*100:.0f}%
- 说服阻力: {config['convince_resistance']*100:.0f}%
- 耐心轮数: {config['patience_rounds']}轮
{framework_context}

核心要求:
1. 保持角色一致性，像真实客户一样回复
2. 回复简短自然，30-100字，像微信聊天
3. 在回复末尾用 [emotion:情绪] 标记，情绪范围: 中立/感兴趣/犹豫/抗拒/敷衍/满意/生气/共情
4. 体现你的异议风格「{persona.get('objection_style', '一般')}」
5. 使用行业特有的表达方式，不要说通用的套话

对话阶段规则（必须严格遵守）:
- 当销售打招呼时，礼貌回应，不要主动提出异议
- 当销售还在了解阶段，保持友好配合
- 只有当销售明确介绍产品/报价/催促成交时，才提出异议
- 对话前期（1-3轮）保持友好，中期（4-6轮）适度疑虑，后期（7轮+）深度异议"""


def _parse_emotion(content: str, current_emotion: str) -> str:
    """Extract emotion tag from response, or infer from content."""
    # Try to parse [emotion:XXX] tag
    if "[emotion:" in content:
        try:
            start = content.index("[emotion:") + 9
            end = content.index("]", start)
            emotion = content[start:end].strip()
            if emotion in EMOTIONS:
                return emotion
        except (ValueError, IndexError):
            pass

    # Infer from keywords
    text = content.lower()
    if any(w in text for w in ["生气", "愤怒", "太过分", "算了"]):
        return "生气"
    elif any(w in text for w in ["不行", "不要", "不需要", "拒绝", "不考虑"]):
        return "抗拒"
    elif any(w in text for w in ["考虑", "再看看", "犹豫", "不确定"]):
        return "犹豫"
    elif any(w in text for w in ["不错", "可以", "挺好", "感兴趣"]):
        return "感兴趣"
    elif any(w in text for w in ["好的", "明白", "了解", "嗯"]):
        return "中立"

    return current_emotion
