"""
IM Webhook Routes — 飞书/钉钉 Webhook 回调端点

用于 Webhook 模式（生产环境，需要公网 IP）。
WebSocket 模式不需要这些端点。
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.im.context import IMContext
from app.im.manager import im_manager
from app.core.logging import logger

router = APIRouter()


@router.post("/feishu/webhook")
async def feishu_webhook(request: Request):
    """飞书 Webhook 回调。

    处理两种请求：
    1. URL 验证（飞书首次配置时的 challenge 验证）
    2. 消息事件（用户发送的消息）
    """
    body = await request.json()

    # URL verification
    if body.get("type") == "url_verification":
        return JSONResponse({"challenge": body.get("challenge", "")})

    # Message event
    if body.get("header", {}).get("event_type") == "im.message.receive_v1":
        try:
            context = IMContext.from_feishu(body.get("event", {}))

            # Only process if bot is mentioned in groups
            if context.is_group and not context.bot_mentioned:
                return JSONResponse({"code": 0})

            # Route to handler
            if im_manager.feishu_channel:
                await im_manager.feishu_channel.on_message(context)

        except Exception as e:
            logger.error(f"[feishu webhook] Error: {e}")

    return JSONResponse({"code": 0})


@router.post("/dingtalk/webhook")
async def dingtalk_webhook(request: Request):
    """钉钉 Webhook 回调。

    钉钉 Stream Mode 不需要此端点，但保留用于 Webhook 回退。
    """
    body = await request.json()

    # URL verification
    if body.get("challenge"):
        return JSONResponse({"challenge": body["challenge"]})

    # Chatbot message
    if body.get("msgtype"):
        try:
            context = IMContext.from_dingtalk(body)

            if context.is_group and not context.bot_mentioned:
                return JSONResponse({"errcode": 0})

            if im_manager.dingtalk_channel:
                await im_manager.dingtalk_channel.on_message(context)

        except Exception as e:
            logger.error(f"[dingtalk webhook] Error: {e}")

    return JSONResponse({"errcode": 0})


@router.get("/im/status")
async def im_status():
    """Get IM channel status."""
    return {"success": True, "data": im_manager.get_status()}
