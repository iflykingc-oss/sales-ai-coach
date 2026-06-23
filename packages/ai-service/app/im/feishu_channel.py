"""
飞书 Channel 实现

参照 CowAgent 的 feishu_channel.py 和 ConnectAI-E/feishu-openai：
- WebSocket 长连接（无需公网 IP）
- CardKit v2 流式打字机效果
- 群聊 @提及过滤
- 消息卡片交互
"""

import json
import asyncio
import aiohttp
from typing import AsyncIterator

from app.im.channel import ChatChannel
from app.im.context import IMContext
from app.im.reply import Reply, ReplyType
from app.core.logging import logger


class FeishuChannel(ChatChannel):
    """飞书机器人 Channel。

    支持两种连接模式：
    - WebSocket: 使用 lark_oapi.ws（开发/小规模，无需公网 IP）
    - Webhook: HTTP 回调（生产环境，需要公网 IP）

    流式响应使用 CardKit v2 API：
    1. POST /cardkit/v1/cards 创建卡片（streaming_mode: true）
    2. POST /im/v1/messages 发送卡片消息
    3. PUT /cardkit/v1/cards/{id}/elements/{eid}/content 增量更新
    4. PATCH /cardkit/v1/cards/{id}/settings 关闭 streaming_mode
    """

    BASE_URL = "https://open.feishu.cn/open-apis"

    def __init__(
        self,
        app_id: str,
        app_secret: str,
        verification_token: str = "",
        encrypt_key: str = "",
    ):
        super().__init__()
        self.platform_name = "feishu"
        self.app_id = app_id
        self.app_secret = app_secret
        self.verification_token = verification_token
        self.encrypt_key = encrypt_key

        self._access_token: str = ""
        self._token_expires_at: float = 0
        self._ws_client = None

    async def start(self):
        """Start Feishu WebSocket listener."""
        try:
            import lark_oapi as lark
            from lark_oapi.ws import Client as WsClient

            event_handler = (
                lark.EventDispatcherHandler.builder(
                    self.verification_token, self.encrypt_key
                )
                .register_p2_im_message_receive_v1(self._on_message_event)
                .build()
            )

            self._ws_client = WsClient(
                self.app_id, self.app_secret, event_handler=event_handler
            )

            logger.info("[feishu] Starting WebSocket listener...")
            # WsClient.start() is blocking, run in thread
            await asyncio.get_event_loop().run_in_executor(
                None, self._ws_client.start
            )

        except ImportError:
            logger.error("[feishu] lark-oapi not installed. Run: pip install lark-oapi")
            raise
        except Exception as e:
            logger.error(f"[feishu] WebSocket start failed: {e}")
            raise

    async def stop(self):
        """Stop Feishu listener."""
        if self._ws_client:
            logger.info("[feishu] Stopping WebSocket listener...")
            # WsClient doesn't have a stop method, just log
            self._ws_client = None

    def _on_message_event(self, ctx, event):
        """Callback from lark_oapi WebSocket event handler.

        This runs in the SDK's thread, so we schedule async processing.
        """
        try:
            # Parse event into IMContext
            event_data = json.loads(event.event.json()) if hasattr(event, 'event') else {}
            im_context = IMContext.from_feishu(event_data)

            # Schedule async processing
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(self.on_message(im_context))
            else:
                loop.run_until_complete(self.on_message(im_context))

        except Exception as e:
            logger.error(f"[feishu] Event processing error: {e}")

    async def send(self, reply: Reply, context: IMContext) -> bool:
        """Send reply to Feishu."""
        try:
            token = await self._get_access_token()

            if reply.type == ReplyType.CARD:
                return await self._send_card(reply, context, token)
            elif reply.type == ReplyType.STREAM:
                return await self._send_stream(reply, context, token)
            else:
                return await self._send_text(reply, context, token)

        except Exception as e:
            logger.error(f"[feishu] Send failed: {e}")
            return False

    async def _send_text(self, reply: Reply, context: IMContext, token: str) -> bool:
        """Send plain text message."""
        url = f"{self.BASE_URL}/im/v1/messages"
        params = {"receive_id_type": "chat_id"}
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        body = {
            "receive_id": context.chat_id,
            "msg_type": "text",
            "content": json.dumps({"text": reply.content}),
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params, json=body, headers=headers) as resp:
                data = await resp.json()
                if data.get("code") == 0:
                    return True
                logger.error(f"[feishu] Send text failed: {data}")
                return False

    async def _send_card(self, reply: Reply, context: IMContext, token: str) -> bool:
        """Send interactive card message."""
        # Build card JSON
        card = {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"content": reply.card_title, "tag": "plain_text"},
                "template": "blue",
            },
            "elements": reply.card_elements,
        }

        # Add buttons if present
        if reply.card_buttons:
            card["elements"].append({"tag": "action", "actions": reply.card_buttons})

        url = f"{self.BASE_URL}/im/v1/messages"
        params = {"receive_id_type": "chat_id"}
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        body = {
            "receive_id": context.chat_id,
            "msg_type": "interactive",
            "content": json.dumps(card),
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params, json=body, headers=headers) as resp:
                data = await resp.json()
                if data.get("code") == 0:
                    return True
                logger.error(f"[feishu] Send card failed: {data}")
                return False

    async def _send_stream(self, reply: Reply, context: IMContext, token: str) -> bool:
        """Send streaming response using CardKit v2.

        CardKit v2 流式打字机效果：
        1. 创建卡片（streaming_mode: true）
        2. 发送卡片消息
        3. 增量更新卡片内容（每次 LLM token）
        4. 关闭 streaming_mode
        """
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Step 1: Create card with streaming_mode
        card_id = await self._create_streaming_card(headers)
        if not card_id:
            # Fallback to text
            return await self._send_text(reply, context, token)

        # Step 2: Send card as message
        msg_sent = await self._send_card_message(card_id, context, headers)
        if not msg_sent:
            return await self._send_text(reply, context, token)

        # Step 3: Stream content updates
        accumulated = ""
        for chunk in reply.stream_chunks:
            accumulated += chunk
            await self._update_card_content(card_id, accumulated, headers)
            await asyncio.sleep(0.05)  # Small delay for typewriter effect

        # Step 4: Close streaming_mode
        await self._close_streaming(card_id, headers)
        return True

    async def _create_streaming_card(self, headers: dict) -> str | None:
        """Create a CardKit v2 card with streaming_mode enabled."""
        url = f"{self.BASE_URL}/cardkit/v1/cards"
        body = {
            "type": "card_json",
            "data": {
                "config": {"wide_screen_mode": True},
                "header": {
                    "title": {"content": "🎓 AI 教练", "tag": "plain_text"},
                    "template": "blue",
                },
                "elements": [{"tag": "markdown", "content": "..."}],
            },
            "settings": {"streaming_mode": True},
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as resp:
                data = await resp.json()
                if data.get("code") == 0:
                    return data.get("data", {}).get("card_id")
                logger.warning(f"[feishu] Card creation failed: {data}")
                return None

    async def _send_card_message(self, card_id: str, context: IMContext, headers: dict) -> bool:
        """Send a card as a message."""
        url = f"{self.BASE_URL}/im/v1/messages"
        params = {"receive_id_type": "chat_id"}
        body = {
            "receive_id": context.chat_id,
            "msg_type": "interactive",
            "content": json.dumps({"type": "card", "data": {"card_id": card_id}}),
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, params=params, json=body, headers=headers) as resp:
                data = await resp.json()
                return data.get("code") == 0

    async def _update_card_content(self, card_id: str, content: str, headers: dict):
        """Update card content (streaming chunk)."""
        # Find the markdown element to update
        url = f"{self.BASE_URL}/cardkit/v1/cards/{card_id}/elements/content"
        body = {"content": content}

        async with aiohttp.ClientSession() as session:
            async with session.put(url, json=body, headers=headers) as resp:
                pass  # Ignore errors during streaming

    async def _close_streaming(self, card_id: str, headers: dict):
        """Close streaming_mode on a card."""
        url = f"{self.BASE_URL}/cardkit/v1/cards/{card_id}/settings"
        body = {"streaming_mode": False}

        async with aiohttp.ClientSession() as session:
            async with session.patch(url, json=body, headers=headers) as resp:
                pass

    async def _get_access_token(self) -> str:
        """Get or refresh tenant access token."""
        import time

        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        url = f"{self.BASE_URL}/auth/v3/tenant_access_token/internal"
        body = {"app_id": self.app_id, "app_secret": self.app_secret}

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body) as resp:
                data = await resp.json()
                self._access_token = data.get("tenant_access_token", "")
                self._token_expires_at = time.time() + data.get("expire", 7200) - 60
                return self._access_token
