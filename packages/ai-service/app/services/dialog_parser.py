"""
Dialog Parser — converts raw OCR text into structured conversation.

Uses LLM to identify speaker roles and extract message content from
raw chat text (WeChat screenshots, email threads, etc.)
"""

import json
from app.models.router import model_router
from app.core.logging import logger
from app.core.sanitization import wrap_user_input
from app.utils.json_parser import extract_json


DIALOG_PARSER_PROMPT = """你是一个微信聊天对话解析专家。用户提供了从截图中OCR识别的原始文字，你需要将其解析为结构化的对话记录。

输入可能是：
1. 微信聊天截图的OCR文字（包含时间戳、昵称、消息内容）
2. 邮件往来
3. 其他IM工具的聊天记录

输出严格的JSON格式：
{
  "dialog": [
    {"role": "customer", "content": "客户说的话"},
    {"role": "sales", "content": "销售说的话"}
  ],
  "confidence": 0.85,
  "context": {
    "channel": "wechat|email|other",
    "participants": ["参与者1", "参与者2"],
    "summary": "对话简要总结"
  }
}

角色判断规则:
- 客户 = 购买方/咨询方
- sales = 销售方/服务提供方

如果无法确定角色:
- 第一个发言者标记为 "customer"
- 第二个发言者标记为 "sales"
- 后续根据对话内容判断

置信度评分:
- 0.9+: 角色清晰、内容完整
- 0.7-0.9: 角色基本确定，可能有遗漏
- 0.5-0.7: OCR质量差，只能部分解析
- <0.5: 无法识别为对话

注意:
1. 只输出JSON，不要其他内容
2. 保留原文的语气和用词
3. 过滤时间戳、系统消息等噪声
4. 如果输入不是对话内容，返回空dialog数组并说明原因"""


async def parse_dialog(raw_text: str) -> dict:
    """
    Parse raw OCR text into structured dialog.

    Args:
        raw_text: Raw text extracted from image by OCR

    Returns:
        {
            "dialog": [{"role": "customer|sales", "content": "..."}],
            "confidence": float,
            "context": {"channel": str, "participants": [...], "summary": str}
        }
    """
    messages = [
        {"role": "system", "content": DIALOG_PARSER_PROMPT},
        {"role": "user", "content": f"请解析以下OCR识别的对话文字:\n\n{wrap_user_input(raw_text)}"},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=2048)

    try:
        parsed = extract_json(result["content"])
        if parsed is None:
            raise ValueError("No valid JSON found")

        # Validate dialog structure
        if "dialog" not in parsed:
            parsed["dialog"] = []
        if "confidence" not in parsed:
            parsed["confidence"] = 0.7
        if "context" not in parsed:
            parsed["context"] = {"channel": "unknown", "participants": [], "summary": ""}

        return parsed

    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse dialog: {result['content']}, error: {e}")
        return {
            "dialog": [],
            "confidence": 0.0,
            "context": {"channel": "unknown", "participants": [], "summary": "解析失败"},
            "raw_output": result["content"][:500],
        }
