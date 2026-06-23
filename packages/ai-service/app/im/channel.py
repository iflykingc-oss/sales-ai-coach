"""
Base Channel abstraction.

参照 CowAgent (45.6K stars) 的 Channel 架构：
- Channel: 抽象基类，定义统一接口
- ChatChannel: 添加会话管理、消息队列、线程池
"""

import asyncio
import time
from abc import ABC, abstractmethod
from collections import OrderedDict
from typing import Any, Callable

from app.im.context import IMContext
from app.im.reply import Reply, ReplyType
from app.core.logging import logger


class ExpiredDict(OrderedDict):
    """Auto-expiring dict for message deduplication and session management.

    参照 CowAgent 的 ExpiringDict 实现。
    """

    def __init__(self, max_len: int = 10000, max_age_seconds: int = 300):
        super().__init__()
        self.max_len = max_len
        self.max_age = max_age_seconds

    def __setitem__(self, key, value):
        if len(self) >= self.max_len:
            # Remove oldest items
            self._cleanup()
        super().__setitem__(key, (value, time.time()))

    def __getitem__(self, key):
        value, ts = super().__getitem__(key)
        if time.time() - ts > self.max_age:
            del self[key]
            raise KeyError(key)
        return value

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def _cleanup(self):
        now = time.time()
        expired = [k for k, (_, ts) in self.items() if now - ts > self.max_age]
        for k in expired:
            del self[k]
        # If still over limit, remove oldest
        while len(self) >= self.max_len:
            self.popitem(last=False)


class Channel(ABC):
    """Abstract base channel — defines the interface all platforms implement."""

    @abstractmethod
    async def send(self, reply: Reply, context: IMContext) -> bool:
        """Send a reply to the platform."""
        ...

    @abstractmethod
    async def start(self):
        """Start listening for messages."""
        ...

    @abstractmethod
    async def stop(self):
        """Stop listening for messages."""
        ...


class ChatChannel(Channel):
    """Chat channel with session management, message queuing, and async processing.

    参照 CowAgent 的 ChatChannel：
    - ExpiringDict 去重（TTL 5 分钟）
    - 会话管理（群共享 / 私聊独立）
    - 异步消息处理
    """

    def __init__(self):
        # Message deduplication (TTL 5 min)
        self._seen_messages = ExpiredDict(max_len=10000, max_age_seconds=300)

        # Session storage: session_id -> {"context": ..., "last_access": float}
        self._sessions: dict[str, dict] = {}

        # Message handlers (registered by the application)
        self._handlers: list[Callable] = []

        # Platform config
        self.platform_name: str = "unknown"

    def register_handler(self, handler: Callable):
        """Register a message handler.

        Handler signature: async def handler(context: IMContext) -> Reply | None
        """
        self._handlers.append(handler)

    async def on_message(self, context: IMContext):
        """Process an incoming message.

        1. Deduplicate by msg_id
        2. Skip if group and bot not mentioned
        3. Route to handlers
        4. Send reply
        """
        # Dedup
        if self._seen_messages.get(context.msg_id):
            logger.debug(f"[{self.platform_name}] Skipping duplicate msg {context.msg_id}")
            return
        self._seen_messages[context.msg_id] = True

        # Group: skip if bot not mentioned
        if context.is_group and not context.bot_mentioned:
            logger.debug(f"[{self.platform_name}] Skipping non-mentioned group msg")
            return

        logger.info(f"[{self.platform_name}] Processing msg from {context.user_id}: {context.content[:50]}")

        # Update session
        self._update_session(context)

        # Route to handlers
        for handler in self._handlers:
            try:
                reply = await handler(context)
                if reply:
                    await self.send(reply, context)
                    return
            except Exception as e:
                logger.error(f"[{self.platform_name}] Handler error: {e}")

        # Default reply if no handler matched
        await self.send(Reply.text("收到！输入 /help 查看可用命令。"), context)

    def _update_session(self, context: IMContext):
        """Update session state."""
        self._sessions[context.session_id] = {
            "last_access": time.time(),
            "user_id": context.user_id,
            "chat_id": context.chat_id,
            "platform": context.platform,
        }

        # Cleanup expired sessions
        now = time.time()
        expired = [sid for sid, s in self._sessions.items() if now - s["last_access"] > 3600]
        for sid in expired:
            del self._sessions[sid]

    def get_session(self, session_id: str) -> dict | None:
        """Get session state by ID."""
        session = self._sessions.get(session_id)
        if session and time.time() - session["last_access"] > 3600:
            del self._sessions[session_id]
            return None
        return session
