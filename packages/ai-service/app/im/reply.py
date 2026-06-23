"""
Platform-agnostic reply types.

参照 CowAgent 的 bridge/reply.py 模式，定义统一的回复类型，
各平台 Channel 负责转换为平台特有的消息格式。
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ReplyType(Enum):
    TEXT = "text"
    MARKDOWN = "markdown"
    IMAGE = "image"
    CARD = "card"  # Interactive card (Feishu/DingTalk)
    STREAM = "stream"  # Streaming response


@dataclass
class Reply:
    """Unified reply object."""

    type: ReplyType = ReplyType.TEXT
    content: str = ""

    # Card-specific fields
    card_title: str = ""
    card_elements: list[dict] = field(default_factory=list)
    card_buttons: list[dict] = field(default_factory=list)

    # Stream-specific fields
    stream_chunks: list[str] = field(default_factory=list)

    # Metadata
    extra: dict = field(default_factory=dict)

    @classmethod
    def text(cls, content: str) -> "Reply":
        return cls(type=ReplyType.TEXT, content=content)

    @classmethod
    def markdown(cls, content: str) -> "Reply":
        return cls(type=ReplyType.MARKDOWN, content=content)

    @classmethod
    def card(cls, title: str, content: str, buttons: list[dict] | None = None) -> "Reply":
        """Build an interactive card reply."""
        elements = [{"tag": "markdown", "content": content}]
        return cls(
            type=ReplyType.CARD,
            card_title=title,
            card_elements=elements,
            card_buttons=buttons or [],
        )

    @classmethod
    def coaching_card(cls, coaching_data: dict) -> "Reply":
        """Build a coaching hint card."""
        hint = coaching_data.get("hint", "")
        dimension = coaching_data.get("dimension", "")
        score = coaching_data.get("score", 0)

        # Score indicator
        if score >= 0.8:
            score_emoji = "🟢"
        elif score >= 0.5:
            score_emoji = "🟡"
        else:
            score_emoji = "🔴"

        content = f"""{score_emoji} **教练提示**

**薄弱维度**: {dimension}
**建议**: {hint}"""

        buttons = [
            {"tag": "button", "text": {"content": "💡 获取更多提示", "tag": "plain_text"}, "value": {"action": "hint"}},
            {"tag": "button", "text": {"content": "📚 相关知识", "tag": "plain_text"}, "value": {"action": "knowledge"}},
        ]

        return cls.card("🎓 教练提示", content, buttons)

    @classmethod
    def script_card(cls, script_data: dict) -> "Reply":
        """Build a script generation result card."""
        styles = script_data.get("speech_styles", [])
        content_parts = []

        for style in styles[:3]:
            style_name = style.get("style", "")
            style_content = style.get("content", "")
            content_parts.append(f"**{style_name}**\n{style_content[:200]}...")

        content = "\n\n---\n\n".join(content_parts)
        buttons = [
            {"tag": "button", "text": {"content": "🎯 开始练习", "tag": "plain_text"}, "value": {"action": "practice"}},
            {"tag": "button", "text": {"content": "📋 完整话术", "tag": "plain_text"}, "value": {"action": "full_script"}},
        ]

        return cls.card("📝 话术生成结果", content, buttons)
