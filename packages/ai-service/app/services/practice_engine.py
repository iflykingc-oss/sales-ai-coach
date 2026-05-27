from app.models.router import model_router
from app.core.logging import logger

EMOTION_MAP = {
    "共情": "empathy",
    "兴趣": "interest",
    "犹豫": "hesitate",
    "抗拒": "resist",
    "敷衍": "dismiss",
    "温暖": "empathy",
    "认可": "interest",
    "顾虑": "hesitate",
    "拒绝": "resist",
}

# Sales logic framework patterns for practice guidance
LOGIC_FRAMEWORKS_PROMPT = """
销售逻辑框架参考（AI客户需识别销售使用的逻辑并做出合理反应）：

1. 预期同步法：现状确认 → 目标对齐 → 路径规划
   - 如果销售在了解现状，客户应配合回答，情绪偏向犹豫
   - 如果销售在设定目标，客户应表达期望，情绪偏向兴趣
   - 如果销售在规划路径，客户应确认配合，情绪偏向共情

2. 差距分析法：标准对标 → 现状评估 → 追赶策略
   - 如果销售在讲标准，客户应对比自身，情绪偏向犹豫
   - 如果销售在评估差距，客户应认可问题，情绪偏向兴趣
   - 如果销售在提方案，客户应期待效果，情绪偏向共情

3. 价值展示法：案例呈现 → 数据支撑 → 专属方案
   - 如果销售在讲案例，客户应对比自身，情绪偏向犹豫
   - 如果销售在展示数据，客户应产生信任，情绪偏向兴趣
   - 如果销售在定制方案，客户应感到被重视，情绪偏向共情

4. 痛点放大法：痛点确认 → 后果推演 → 方案呈现
   - 如果销售在确认痛点，客户应回忆问题，情绪偏向抗拒/犹豫
   - 如果销售在推演后果，客户应感到紧迫感，情绪偏向犹豫
   - 如果销售在呈现方案，客户应看到希望，情绪偏向兴趣

5. SPIN销售法：情境问题 → 难点问题 → 暗示问题 → 需求效益问题
   - 如果销售在问情境问题(S)，客户应如实介绍现状，情绪偏向中性/配合
   - 如果销售在问难点问题(P)，客户应坦诚困难，情绪偏向犹豫
   - 如果销售在问暗示问题(I)，客户应意识到严重性，情绪偏向焦虑/紧迫
   - 如果销售在问需求效益问题(N)，客户应主动表达需求，情绪偏向兴趣/期待
"""

async def process_practice_message(scenario: str, messages: list[dict], industry: str = "", mode: str = "scenario", logicFramework: str = "") -> dict:
    """Process a practice conversation message and generate customer response."""

    # Build system prompt with logic framework guidance
    framework_context = ""
    if logicFramework:
        framework_context = f"\n当前销售使用的逻辑框架：{logicFramework}\n请根据该框架的阶段特点做出符合逻辑的情绪反应。"

    system_prompt = f"""你是一个{industry + '行业' if industry else ''}的客户角色，正在参与销售陪练。
场景：{scenario}
模式：{mode}{framework_context}

{LOGIC_FRAMEWORKS_PROMPT}

要求：
1. 保持客户角色的真实性格
2. 根据销售的话术产生真实的情绪反应
3. 回复要简短自然，像真实的微信对话
4. 识别销售使用的逻辑框架阶段，做出符合该阶段的情绪反应
5. 在回复末尾用 [情绪:xxx] 标记当前情绪（共情/兴趣/犹豫/抗拒/敷衍）
6. 最多10轮对话后，标记 [结束] 并给出评分
7. 情绪变化要符合逻辑：抗拒→犹豫→兴趣→共情 是正常路径"""

    result = await model_router.chat_with_fallback(
        [{"role": "system", "content": system_prompt}] + messages,
        temperature=0.8,
        max_tokens=512,
    )

    content = result["content"]
    emotion = "hesitate"
    is_complete = False
    score = None

    for keyword, mapped in EMOTION_MAP.items():
        if keyword in content:
            emotion = mapped
            break

    if "[结束]" in content:
        is_complete = True
        # Try to extract score
        import re
        score_match = re.search(r"评分[：:]\s*(\d+)", content)
        if score_match:
            score = int(score_match.group(1)) / 100

    # Clean up markers from response
    clean_content = content.replace("[结束]", "").replace(f"[情绪:{emotion}]", "").strip()

    return {
        "response": clean_content,
        "emotion": emotion,
        "score": score,
        "isComplete": is_complete,
    }
