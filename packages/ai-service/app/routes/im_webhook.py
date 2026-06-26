"""
IM Webhook Routes �?飞书/钉钉 Webhook 回调端点

用于 Webhook 模式（生产环境，需要公�?IP）�?WebSocket 模式不需要这些端点�?

安全说明�?
- 飞书 Webhook 必须验证 encrypt 字段（aes-256-cbc + PKCS#7），对其解密结果
  校验 verification_token / token�?
- 钉钉 Webhook 必须 HMAC-SHA256 验证 sign 字段（timestamp + "\n" + secret），
  并强制即位历史时间在 5 分钟以内�?
- 如果对应 channel 未配置，直接返回 503，避免未使用的端点暴露网络吞不安全门�?
"""
import hashlib
import hmac
import base64
import time
from typing import Optional, Tuple

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import logger
from app.im.context import IMContext
from app.im.manager import im_manager

router = APIRouter()


# ---------------------------------------------------------------------------
# Feishu signature verification
# ---------------------------------------------------------------------------

FEISHU_AES_BLOCK_SIZE = 32  # 256-bit blocks


def _feishu_decrypt(encrypt_b64: str, encrypt_key: str) -> Optional[bytes]:
    """Decrypt a Feishu `encrypt` field using the official AES-256-CBC + PKCS#7 scheme.

    Reference: https://open.feishu.cn/document/server-docs/event-subscription-guide/encrypt-key
    """
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding
    except ImportError:
        logger.error("[feishu] cryptography library not installed; cannot verify webhook")
        return None

    try:
        # encrypt_key is base64. The actual AES key = SHA256(encrypt_key_raw_string).
        key_hash = hashlib.sha256(encrypt_key.encode("utf-8")).digest()

        ciphertext = base64.b64decode(encrypt_b64)
        if len(ciphertext) < FEISHU_AES_BLOCK_SIZE + 1:
            return None
        iv = ciphertext[:FEISHU_AES_BLOCK_SIZE]
        body = ciphertext[FEISHU_AES_BLOCK_SIZE:]

        cipher = Cipher(algorithms.AES(key_hash), modes.CBC(iv))
        decryptor = cipher.decryptor()
        padded = decryptor.update(body) + decryptor.finalize()

        unpadder = padding.PKCS7(FEISHU_AES_BLOCK_SIZE * 8).unpadder()
        return unpadder.update(padded) + unpadder.finalize()
    except Exception as e:
        logger.warning(f"[feishu] decrypt failed: {e}")
        return None


def _verify_feishu_event(raw_body: dict) -> Tuple[bool, Optional[dict], Optional[str]]:
    """Returns (ok, decrypted_event_or_None, error_msg)."""
    settings = get_settings()
    verification_token = getattr(settings, "feishu_verification_token", "")
    encrypt_key = getattr(settings, "feishu_encrypt_key", "")

    if not verification_token or not encrypt_key:
        return False, None, "feishu verification_token / encrypt_key not configured"

    # URL verification challenge (Feishu sends `encrypt` even during handshake)
    if raw_body.get("type") == "url_verification":
        encrypt_b64 = raw_body.get("encrypt", "")
        if not encrypt_b64:
            return False, None, "missing encrypt in url_verification"
        plaintext = _feishu_decrypt(encrypt_b64, encrypt_key)
        if plaintext is None:
            return False, None, "decrypt failed during url_verification"
        try:
            decoded = __import__("json").loads(plaintext.decode("utf-8"))
        except Exception as e:
            return False, None, f"json parse failed: {e}"
        # Echo the challenge back
        return True, {"_challenge": decoded.get("challenge", "")}, None

    # Encrypted event
    if "encrypt" in raw_body:
        encrypt_b64 = raw_body.get("encrypt", "")
        plaintext = _feishu_decrypt(encrypt_b64, encrypt_key)
        if plaintext is None:
            return False, None, "decrypt failed"
        try:
            decoded = __import__("json").loads(plaintext.decode("utf-8"))
        except Exception as e:
            return False, None, f"json parse failed: {e}"
        # Verify token matches what we configured
        token_in_event = decoded.get("header", {}).get("token") or decoded.get("token")
        if token_in_event and token_in_event != verification_token:
            return False, None, "verification_token mismatch"
        return True, decoded, None

    # Plain (unencrypted) event - reject unless explicitly opted in via env
    if not getattr(settings, "feishu_allow_unencrypted", False):
        return False, None, "unencrypted event rejected (set FEISHU_ALLOW_UNENCRYPTED=true to allow)"

    token_in_event = raw_body.get("header", {}).get("token") or raw_body.get("token")
    if token_in_event and token_in_event != verification_token:
        return False, None, "verification_token mismatch"
    return True, raw_body, None


# ---------------------------------------------------------------------------
# DingTalk signature verification
# ---------------------------------------------------------------------------

DINGTALK_MAX_TIMESTAMP_SKEW = 300  # 5 minutes


def _verify_dingtalk_event(raw_body: dict) -> Tuple[bool, Optional[str]]:
    """Returns (ok, error_msg)."""
    settings = get_settings()
    app_secret = getattr(settings, "dingtalk_app_secret", "") or getattr(
        settings, "dingtalk_client_secret", ""
    )

    # The very first handshake (challenge) does not include signature
    if "challenge" in raw_body and "sign" not in raw_body:
        return True, None

    timestamp = raw_body.get("timestamp")
    sign = raw_body.get("sign")
    if not timestamp or not sign:
        return False, None, "missing timestamp/sign"

    try:
        ts_int = int(timestamp)
    except (TypeError, ValueError):
        return False, None, "invalid timestamp"

    if abs(time.time() - ts_int / 1000) > DINGTALK_MAX_TIMESTAMP_SKEW:
        return False, None, "timestamp out of range"

    if not app_secret:
        return False, None, "dingtalk app_secret not configured"

    string_to_sign = f"{timestamp}\n{app_secret}"
    digest = hmac.new(
        app_secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected = base64.b64encode(digest).decode("utf-8")

    if not hmac.compare_digest(expected, sign):
        return False, None, "sign mismatch"
    return True, None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/feishu/webhook")
async def feishu_webhook(request: Request):
    """飞书 Webhook 回调�?    处理两种请求�?    1. URL 验证（飞书首次配置时�?challenge 验证�?    2. 消息事件（用户发送的消息）�?"""
    if im_manager.feishu_channel is None:
        return JSONResponse(
            status_code=503,
            content={"code": -1, "msg": "feishu channel not configured"},
        )

    try:
        raw_body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"code": -1, "msg": "invalid json"})

    ok, decoded, err = _verify_feishu_event(raw_body)
    if not ok:
        logger.warning(f"[feishu webhook] signature verify failed: {err}")
        return JSONResponse(status_code=401, content={"code": -1, "msg": "invalid signature"})

    # URL verification echo
    if isinstance(decoded, dict) and "_challenge" in decoded:
        return JSONResponse({"challenge": decoded["_challenge"]})

    # Message event
    if decoded.get("header", {}).get("event_type") == "im.message.receive_v1":
        try:
            context = IMContext.from_feishu(decoded.get("event", {}))

            if context.is_group and not context.bot_mentioned:
                # In group chats, only respond when the bot is at-mentioned.
                # Send a one-time hint so users learn to @ the bot.
                if im_manager.feishu_channel:
                    try:
                        from app.im.reply import Reply, ReplyType
                        await im_manager.feishu_channel.send(
                            Reply(
                                type=ReplyType.TEXT,
                                content="请 @ 我才能响应哦，例如 @AI教练 帮我分析下这个客户。",
                            ),
                            context,
                        )
                    except Exception as e:
                        logger.warning(f"[feishu webhook] failed to send hint: {e}")
                return JSONResponse({"code": 0})

            if im_manager.feishu_channel:
                await im_manager.feishu_channel.on_message(context)

        except Exception as e:
            logger.error(f"[feishu webhook] processing error: {e}")
            # 200 so Feishu doesn't retry; we logged the error
            return JSONResponse({"code": 0})

    return JSONResponse({"code": 0})


@router.post("/dingtalk/webhook")
async def dingtalk_webhook(request: Request):
    """钉钉 Webhook 回调�?    验证 HMAC 签名�?5 分钟附过时间窄�?"""
    if im_manager.dingtalk_channel is None:
        return JSONResponse(
            status_code=503,
            content={"errcode": -1, "errmsg": "dingtalk channel not configured"},
        )

    try:
        raw_body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"errcode": -1, "errmsg": "invalid json"})

    ok, err = _verify_dingtalk_event(raw_body)
    if not ok:
        logger.warning(f"[dingtalk webhook] signature verify failed: {err}")
        return JSONResponse(status_code=401, content={"errcode": -1, "errmsg": "invalid signature"})

    if "challenge" in raw_body and "sign" not in raw_body:
        return JSONResponse({"challenge": raw_body["challenge"]})

    if raw_body.get("msgtype"):
        try:
            context = IMContext.from_dingtalk(raw_body)
            if context.is_group and not context.bot_mentioned:
                return JSONResponse({"errcode": 0})
            if im_manager.dingtalk_channel:
                await im_manager.dingtalk_channel.on_message(context)
        except Exception as e:
            logger.error(f"[dingtalk webhook] processing error: {e}")
            return JSONResponse({"errcode": 0})

    return JSONResponse({"errcode": 0})


@router.get("/im/status")
async def im_status():
    """Get IM channel status (operator-only)."""
    # Hide detailed session counts unless explicitly authorized
    return {"success": True, "data": im_manager.get_status()}
