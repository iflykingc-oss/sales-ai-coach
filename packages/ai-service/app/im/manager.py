"""
IM Channel Manager — 初始化和管理所有 IM Channel

在 FastAPI startup 事件中初始化 Channel，在 shutdown 事件中清理。
"""

import asyncio
from app.core.config import get_settings
from app.core.logging import logger


class IMManager:
    """Manage IM channel lifecycle."""

    def __init__(self):
        self.feishu_channel = None
        self.dingtalk_channel = None
        self._router = None
        self._tasks: list[asyncio.Task] = []

    async def start(self):
        """Initialize and start all configured IM channels."""
        settings = get_settings()

        # Initialize router
        from app.im.router import IMRouter
        self._router = IMRouter()

        # Start Feishu if configured
        feishu_app_id = getattr(settings, "feishu_app_id", "")
        feishu_app_secret = getattr(settings, "feishu_app_secret", "")

        if feishu_app_id and feishu_app_secret:
            try:
                from app.im.feishu_channel import FeishuChannel
                self.feishu_channel = FeishuChannel(
                    app_id=feishu_app_id,
                    app_secret=feishu_app_secret,
                    verification_token=getattr(settings, "feishu_verification_token", ""),
                    encrypt_key=getattr(settings, "feishu_encrypt_key", ""),
                )
                self.feishu_channel.register_handler(self._router.route)

                task = asyncio.create_task(self.feishu_channel.start())
                self._tasks.append(task)
                logger.info("[im] Feishu channel started")
            except Exception as e:
                logger.warning(f"[im] Feishu channel failed to start: {e}")
        else:
            logger.info("[im] Feishu not configured (missing app_id/app_secret)")

        # Start DingTalk if configured
        dingtalk_client_id = getattr(settings, "dingtalk_client_id", "")
        dingtalk_client_secret = getattr(settings, "dingtalk_client_secret", "")

        if dingtalk_client_id and dingtalk_client_secret:
            try:
                from app.im.dingtalk_channel import DingTalkChannel
                self.dingtalk_channel = DingTalkChannel(
                    client_id=dingtalk_client_id,
                    client_secret=dingtalk_client_secret,
                )
                self.dingtalk_channel.register_handler(self._router.route)

                task = asyncio.create_task(self.dingtalk_channel.start())
                self._tasks.append(task)
                logger.info("[im] DingTalk channel started")
            except Exception as e:
                logger.warning(f"[im] DingTalk channel failed to start: {e}")
        else:
            logger.info("[im] DingTalk not configured (missing client_id/client_secret)")

    async def stop(self):
        """Stop all IM channels."""
        if self.feishu_channel:
            await self.feishu_channel.stop()
        if self.dingtalk_channel:
            await self.dingtalk_channel.stop()

        for task in self._tasks:
            task.cancel()

        logger.info("[im] All channels stopped")

    def get_status(self) -> dict:
        """Get status of all channels."""
        return {
            "feishu": {
                "configured": self.feishu_channel is not None,
                "sessions": len(self.feishu_channel._sessions) if self.feishu_channel else 0,
            },
            "dingtalk": {
                "configured": self.dingtalk_channel is not None,
                "sessions": len(self.dingtalk_channel._sessions) if self.dingtalk_channel else 0,
            },
        }


# Singleton
im_manager = IMManager()
