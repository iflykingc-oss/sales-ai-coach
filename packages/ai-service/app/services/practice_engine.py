from app.models.router import model_router
from app.core.logging import logger

EMOTION_MAP = {
    "共情": "soften",
    "兴趣": "interested",
    "犹豫": "hesitant",
    "抗拒": "resistant",
    "敷衍": "dismissive",
}


async def process_practice_message(scenario: str, messages: list[dict], industry: str = "", mode: str = "scenario") -> dict:
    """Process a practice conversation message and generate customer response."""
    system_prompt = f"""你是一个{industry + '行业' if industry else ''}的客户角色，正在参与销售陪练。
场景：{scenario}
模式：{mode}

要求：
1. 保持客户角色的真实性格
2. 根据销售的话术产生真实的情绪反应
3. 回复要简短自然，像真实的微信对话
4. 在回复末尾用 [情绪:xxx] 标记当前情绪（共情/兴趣/犹豫/抗拒/敷衍）
5. 最多10轮对话后，标记 [结束] 并给出评分"""

    result = await model_router.chat_with_fallback(
        [{"role": "system", "content": system_prompt}] + messages,
        temperature=0.8,
        max_tokens=512,
    )

    content = result["content"]
    emotion = "中立"
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
