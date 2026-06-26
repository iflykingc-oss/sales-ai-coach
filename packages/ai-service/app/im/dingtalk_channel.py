"""
钉钉 Channel 实现

参照 CowAgent 的 dingtalk_channel.py 和 dingtalk-stream SDK：
- Stream Mode 长连接（无需公网 IP）
- AI Card 流式响应（flowStatus: PROCESSING → DONE）
- 群聊 @提及过滤
"""

import json
import asyncio
import time
import aiohttp
from typing import AsyncIterator

from app.im.channel import ChatChannel
from app.im.context import IMContext
from app.im.reply import Reply, ReplyType
from app.core.logging import logger


class DingTalkChannel(ChatChannel):
    """钉钉机器人 Channel。

    连接模式：Stream Mode（WebSocket 长连接，无需公网 IP）

    流式响应使用 AI Card：
    1. 创建卡片（flowStatus=PROCESSING → 显示加载动画）
    2. patch_card 更新内容
    3. 设置 flowStatus=DONE → 完成
    """

    BASE_URL = "https://api.dingtalk.com/v1.0"

    def __init__(self, client_id: str, client_secret: str):
        super().__init__()
        self.platform_name = "dingtalk"
        self.client_id = client_id
        self.client_secret = client_secret

        self._access_token: str = ""
        self._token_expires_at: float = 0
        self._stream_client = None

    async def start(self):
        """Start DingTalk Stream listener."""
        if not self.client_id or not self.client_secret:
            raise RuntimeError(
                "[dingtalk] client_id and client_secret are required."
            )
        try:
            import dingtalk_stream

            class ChatBotHandler(dingtalk_stream.ChatbotHandler):
                def __init__(self, channel: "DingTalkChannel"):
                    super().__init__()
                    self._channel = channel

                async def on_chat_receive(self, callback):
                    """Handle incoming chat messages."""
                    try:
                        event = callback.data
                        im_context = IMContext.from_dingtalk(event)
                        await self._channel.on_message(im_context)
                    except Exception as e:
                        logger.error(f"[dingtalk] Chat receive error: {e}")

                    return AckMessage()

            self._stream_client = dingtalk_stream.StreamClient(
                self.client_id,
                self.client_secret,
                dingtalk_stream.ChatbotMessage.TOPIC,
            )

            handler = ChatBotHandler(self)
            self._stream_client.register_callback_handler("/", handler)

            logger.info("[dingtalk] Starting Stream listener...")
            await asyncio.get_event_loop().run_in_executor(
                None, self._stream_client.start_forever
            )

        except ImportError:
            logger.error("[dingtalk] dingtalk-stream not installed. Run: pip install dingtalk-stream")
            raise
        except Exception as e:
            logger.error(f"[dingtalk] Stream start failed: {e}")
            raise

    async def stop(self):
        """Stop DingTalk listener."""
        if self._stream_client:
            logger.info("[dingtalk] Stopping Stream listener...")
            self._stream_client = None

    # DingTalk message size limit: 20KB
    MAX_CONTENT_BYTES = 20 * 1024

    async def send(self, reply: Reply, context: IMContext) -> bool:
        """Send reply to DingTalk."""
        try:
            # Validate message size
            self._validate_reply_size(reply)

            token = await self._get_access_token()

            if reply.type == ReplyType.CARD:
                return await self._send_card(reply, context, token)
            elif reply.type == ReplyType.STREAM:
                return await self._send_stream(reply, context, token)
            else:
                return await self._send_text(reply, context, token)

        except Exception as e:
            logger.error(f"[dingtalk] Send failed: {e}")
            return False

    def _validate_reply_size(self, reply: Reply):
        """Truncate reply content if it exceeds DingTalk's 20KB limit."""
        suffix = "...(truncated)"
        content = reply.content
        if len(content.encode("utf-8")) > self.MAX_CONTENT_BYTES:
            max_bytes = self.MAX_CONTENT_BYTES - len(suffix.encode("utf-8"))
            truncated = content.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")
            reply.content = truncated + suffix

    async def _send_text(self, reply: Reply, context: IMContext, token: str) -> bool:
        """Send plain text message."""
        url = f"{self.BASE_URL}/robot/groupMessages/send"
        headers = {
            "x-acs-dingtalk-access-token": token,
            "Content-Type": "application/json",
        }

        body = {
            "msgParam": json.dumps({"content": reply.content}),
            "msgtype": "text",
            "openConversationId": context.chat_id,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as resp:
                data = await resp.json()
                if data.get("messageId"):
                    return True
                logger.error(f"[dingtalk] Send text failed: {data}")
                return False

    async def _send_card(self, reply: Reply, context: IMContext, token: str) -> bool:
        """Send interactive card (ActionCard)."""
        url = f"{self.BASE_URL}/robot/groupMessages/send"
        headers = {
            "x-acs-dingtalk-access-token": token,
            "Content-Type": "application/json",
        }

        # Build action card
        buttons = []
        for btn in reply.card_buttons:
            buttons.append({
                "title": btn.get("text", {}).get("content", ""),
                "actionURL": f"dingtalk://dingtalkclient/page/link?url={btn.get('value', {}).get('action', '')}",
            })

        body = {
            "msgParam": json.dumps({
                "title": reply.card_title,
                "text": reply.content,
                "btnOrientation": "1",
                "btns": buttons,
            }),
            "msgtype": "actionCard",
            "openConversationId": context.chat_id,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as resp:
                data = await resp.json()
                return bool(data.get("messageId"))

    async def _send_stream(self, reply: Reply, context: IMContext, token: str) -> bool:
        """Send streaming response using DingTalk AI Card.

        Flow:
        1. Create card with flowStatus=PROCESSING (shows loading animation)
        2. Incrementally patch card content as chunks arrive
        3. Set flowStatus=DONE to finalize
        """
        headers = {
            "x-acs-dingtalk-access-token": token,
            "Content-Type": "application/json",
        }

        # Step 1: Create initial AI Card with PROCESSING status
        card_instance_id = await self._create_ai_card(reply, context, headers)
        if not card_instance_id:
            # Fallback: accumulate and send as plain card
            accumulated = ""
            for chunk in reply.stream_chunks:
                accumulated += chunk
            reply.type = ReplyType.CARD
            reply.content = accumulated
            return await self._send_card(reply, context, token)

        # Step 2: Patch content as chunks arrive
        accumulated = ""
        for chunk in reply.stream_chunks:
            accumulated += chunk
            await self._patch_ai_card(card_instance_id, accumulated, headers, flow_status="PROCESSING")
            await asyncio.sleep(0.05)

        # Step 3: Finalize with DONE status
        await self._patch_ai_card(card_instance_id, accumulated, headers, flow_status="DONE")
        return True

    async def _create_ai_card(self, reply: Reply, context: IMContext, headers: dict) -> str | None:
        """Create a DingTalk AI Card and send it as a message.

        Returns the cardInstanceId on success, None on failure.
        """
        url = f"{self.BASE_URL}/robot/groupMessages/send"

        # Initial card template with PROCESSING flowStatus
        card_content = json.dumps({
            "card": {
                "config": {"wideScreenMode": True},
                "header": {
                    "title": {"tag": "markdown", "content": reply.card_title or "🎓 AI 教练"},
                    "subtitle": {"tag": "markdown", "content": ""},
                },
                "elements": [
                    {"tag": "markdown", "content": "..."},
                ],
            },
            "flowStatus": "PROCESSING",
        })

        body = {
            "msgParam": card_content,
            "msgtype": "aiCard",
            "openConversationId": context.chat_id,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as resp:
                data = await resp.json()
                card_instance_id = data.get("cardInstanceId") or data.get("messageId")
                if card_instance_id:
                    return card_instance_id
                logger.warning(f"[dingtalk] AI Card creation failed: {data}")
                return None

    async def _patch_ai_card(
        self,
        card_instance_id: str,
        content: str,
        headers: dict,
        flow_status: str = "PROCESSING",
    ):
        """Update AI Card content and flowStatus."""
        url = f"{self.BASE_URL}/robot/messageCards/patch"

        card_patch = json.dumps({
            "card": {
                "config": {"wideScreenMode": True},
                "elements": [
                    {"tag": "markdown", "content": content},
                ],
            },
            "flowStatus": flow_status,
        })

        body = {
            "cardInstanceId": card_instance_id,
            "cardBizId": card_instance_id,
            "msgParam": card_patch,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as resp:
                data = await resp.json()
                if resp.status != 200:
                    logger.warning(f"[dingtalk] AI Card patch failed (status={resp.status}): {data}")

    async def _get_access_token(self) -> str:
        """Get or refresh DingTalk access token."""
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        url = f"{self.BASE_URL}/oauth2/accessToken"
        body = {"appKey": self.client_id, "appSecret": self.client_secret}

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body) as resp:
                data = await resp.json()
                self._access_token = data.get("accessToken", "")
                self._token_expires_at = time.time() + data.get("expireIn", 7200) - 60
                return self._access_token
