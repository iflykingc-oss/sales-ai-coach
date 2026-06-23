"""
Platform-agnostic IM context.

参照 CowAgent 的 bridge/context.py 模式，将平台特有的消息格式
统一为通用上下文对象，上层逻辑不依赖任何平台 API。
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class IMContext:
    """Unified message context across all IM platforms."""

    # Platform identification
    platform: str  # "feishu" | "dingtalk" | "wecom"
    msg_id: str  # Platform-specific message ID

    # Sender info
    user_id: str  # Platform-specific user ID
    user_name: str = ""
    user_open_id: str = ""  # Feishu open_id / DingTalk unionId

    # Chat info
    chat_id: str = ""  # Group ID or private chat ID
    chat_type: str = "private"  # "private" | "group"
    is_group: bool = False

    # Message content
    content: str = ""  # Plain text content
    msg_type: str = "text"  # "text" | "image" | "file" | "audio"
    raw_message: dict = field(default_factory=dict)  # Original platform message

    # Mentions
    mentioned_users: list[str] = field(default_factory=list)
    bot_mentioned: bool = False

    # Session management
    session_id: str = ""  # Derived: group_id for groups, user_id for private

    # Metadata
    timestamp: float = 0.0
    extra: dict = field(default_factory=dict)

    def __post_init__(self):
        """Derive session_id if not explicitly set."""
        if not self.session_id:
            if self.is_group:
                self.session_id = f"group:{self.chat_id}"
            else:
                self.session_id = f"user:{self.user_id}"

    @classmethod
    def from_feishu(cls, event: dict) -> "IMContext":
        """Parse Feishu event into IMContext."""
        message = event.get("message", {})
        sender = event.get("sender", {})
        chat = message.get("chat", {})

        chat_type = message.get("chat_type", "p2p")
        is_group = chat_type == "group"

        # Extract text content
        content = ""
        if message.get("message_type") == "text":
            import json
            try:
                body = json.loads(message.get("content", "{}"))
                content = body.get("text", "")
            except (json.JSONDecodeError, TypeError):
                content = message.get("content", "")

        # Check mentions
        mentions = message.get("mentions", [])
        bot_mentioned = any(m.get("key") == "@_user_1" for m in mentions)
        mentioned_users = [m.get("id", {}).get("open_id", "") for m in mentions]

        # Strip @mention from content
        if bot_mentioned:
            content = content.replace("@_user_1", "").strip()

        return cls(
            platform="feishu",
            msg_id=message.get("message_id", ""),
            user_id=sender.get("sender_id", {}).get("open_id", ""),
            user_open_id=sender.get("sender_id", {}).get("open_id", ""),
            chat_id=chat.get("chat_id", ""),
            chat_type="group" if is_group else "private",
            is_group=is_group,
            content=content,
            msg_type=message.get("message_type", "text"),
            raw_message=event,
            mentioned_users=mentioned_users,
            bot_mentioned=bot_mentioned,
            timestamp=float(message.get("create_time", "0")) / 1000,
        )

    @classmethod
    def from_dingtalk(cls, event: dict) -> "IMContext":
        """Parse DingTalk event into IMContext."""
        # DingTalk chatbot callback format
        conversation_type = str(event.get("conversationType", "1"))
        is_group = conversation_type == "2"

        content = event.get("text", {}).get("content", "").strip()
        at_users = event.get("atUsers", [])
        sender_id = event.get("senderId", "")
        sender_nick = event.get("senderNick", "")

        # Check if bot was mentioned
        bot_user_id = event.get("robotCode", "")
        bot_mentioned = any(
            u.get("dingtalkId") == bot_user_id for u in at_users
        )

        return cls(
            platform="dingtalk",
            msg_id=event.get("msgId", ""),
            user_id=sender_id,
            user_name=sender_nick,
            chat_id=event.get("conversationId", ""),
            chat_type="group" if is_group else "private",
            is_group=is_group,
            content=content,
            msg_type="text",
            raw_message=event,
            bot_mentioned=bot_mentioned,
            timestamp=event.get("createAt", 0) / 1000 if event.get("createAt") else 0,
        )
