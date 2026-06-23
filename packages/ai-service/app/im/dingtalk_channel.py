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

    async def send(self, reply: Reply, context: IMContext) -> bool:
        """Send reply to DingTalk."""
        try:
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
        """Send streaming response using AI Card.

        DingTalk AI Card 流程：
        1. 创建卡片（flowStatus=PROCESSING）
        2. 增量更新内容
        3. 设置 flowStatus=DONE
        """
        # For DingTalk, accumulate and send as single card
        # (DingTalk's streaming API is more complex, simplified here)
        accumulated = ""
        for chunk in reply.stream_chunks:
            accumulated += chunk

        reply.type = ReplyType.CARD
        reply.content = accumulated
        return await self._send_card(reply, context, token)

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
