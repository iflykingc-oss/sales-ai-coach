from app.models.router import model_router
from app.core.logging import logger
import json

REVIEW_PROMPT = """你是一个销售教练和复盘专家。请分析以下销售对话，生成详细的复盘报告。

输出JSON格式：
{
  "summary": "整体总结（2-3句话）",
  "strengths": ["做得好的地方1", "做得好的地方2", "做得好的地方3"],
  "improvements": ["需改进的地方1", "需改进的地方2", "需改进的地方3"],
  "recommendations": ["建议1", "建议2"],
  "actionItems": ["明日行动1", "明日行动2"],
  "radarScores": {
    "共情能力": 80,
    "需求挖掘": 75,
    "异议处理": 60,
    "成交推进": 70,
    "产品知识": 85,
    "沟通表达": 80,
    "节奏把控": 65,
    "信任建立": 75
  }
}

评分标准：0-100分，60分及格，80分良好，90分以上优秀。

对话内容：
{conversations}"""


async def analyze_conversations(conversations: list[dict]) -> dict:
    """Analyze sales conversations and generate review report."""
    convo_text = "\n".join(
        f"[{c['role']}]: {c['content']}" for c in conversations
    )

    messages = [
        {"role": "system", "content": REVIEW_PROMPT.format(conversations=convo_text[:5000])},
        {"role": "user", "content": "请生成复盘报告"},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.5, max_tokens=2048)

    try:
        content = result["content"]
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except json.JSONDecodeError:
        logger.error(f"Failed to parse review analysis: {result['content']}")
        return {
            "summary": result["content"][:200],
            "strengths": ["需要进一步分析"],
            "improvements": ["建议多练习"],
            "recommendations": ["继续积累话术"],
            "actionItems": ["复盘今日对话"],
            "radarScores": {
                "共情能力": 70, "需求挖掘": 70, "异议处理": 70, "成交推进": 70,
                "产品知识": 70, "沟通表达": 70, "节奏把控": 70, "信任建立": 70,
            },
        }
