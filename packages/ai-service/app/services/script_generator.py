import json
from app.models.router import model_router
from app.core.logging import logger

SCRIPT_GENERATION_PROMPT = """你是一个专业的销售话术生成专家。根据用户提供的客户对话场景，生成3种不同风格的实用话术。

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "speech_styles": [
    {"style": "共情版", "content": "话术内容"},
    {"style": "直爽版", "content": "话术内容"},
    {"style": "专业版", "content": "话术内容"}
  ],
  "reasoning": ["原因1", "原因2", "原因3"],
  "pitfalls": [{"action": "不要做的事", "reason": "为什么不要做"}],
  "knowledge_source": "知识库来源描述",
  "confidence_score": 0.85
}

要求：
1. 话术要具体、可复制、无套路感
2. 原因要解释为什么这样说有效
3. 避坑要提醒常见的销售错误
4. 语气自然，像朋友之间的对话"""


async def generate_sales_script(input_text: str, input_type: str, industry: str = "", context: str = "") -> dict:
    """Generate sales scripts based on user input."""
    messages = [
        {"role": "system", "content": SCRIPT_GENERATION_PROMPT},
        {"role": "user", "content": f"输入类型: {input_type}\n行业: {industry}\n场景描述:\n{input_text}\n补充信息: {context}"},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.7, max_tokens=2048)

    # Parse JSON from response
    content = result["content"]
    try:
        # Extract JSON from possible markdown code block
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except json.JSONDecodeError:
        logger.error(f"Failed to parse script generation response: {content}")
        return {
            "speech_styles": [
                {"style": "共情版", "content": content[:500]},
                {"style": "直爽版", "content": content[500:1000]},
                {"style": "专业版", "content": content[1000:1500]},
            ],
            "reasoning": ["根据输入场景生成"],
            "pitfalls": [{"action": "不要直接复制", "reason": "需要根据实际情况调整"}],
            "knowledge_source": "AI生成",
            "confidence_score": 0.5,
        }
