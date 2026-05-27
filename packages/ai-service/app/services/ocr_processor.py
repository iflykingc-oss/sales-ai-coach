"""
OCR Processing — real screenshot-to-dialog pipeline.

Flow: Screenshot → OCR API → LLM Parse → Structured Dialog

Supports multiple OCR backends:
1. PaddleOCR (local, requires paddleocr installed)
2. Cloud OCR API (configurable: Baidu, Tencent, Google Vision)
3. LLM vision model (if model supports image input, like GPT-4o/Claude)
"""

import asyncio
import base64
import os
import json
import httpx
from app.core.logging import logger
from app.core.config import get_settings

_paddle_ocr_instance = None


def _get_paddle_ocr():
    global _paddle_ocr_instance
    if _paddle_ocr_instance is None:
        from paddleocr import PaddleOCR
        _paddle_ocr_instance = PaddleOCR(use_angle_cls=True, lang="ch", use_gpu=False)
    return _paddle_ocr_instance


async def process_image(image_data: str) -> str:
    """Extract text from image using best available OCR backend."""
    # Decode image
    if image_data.startswith("http"):
        async with httpx.AsyncClient() as client:
            response = await client.get(image_data, timeout=30)
            image_bytes = response.content
    elif image_data.startswith("data:"):
        # data:image/png;base64,...
        _, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)
    else:
        image_bytes = base64.b64decode(image_data)

    logger.info(f"Processing image OCR, size: {len(image_bytes)} bytes")

    # Try PaddleOCR first (local, fastest)
    text = await _try_paddleocr(image_bytes)
    if text:
        return text

    # Fall back to cloud OCR API
    text = await _try_cloud_ocr(image_bytes)
    if text:
        return text

    # Last resort: return empty and let LLM handle via vision model
    logger.warning("All OCR backends failed, returning empty text")
    return ""


async def _try_paddleocr(image_bytes: bytes) -> str | None:
    """Try PaddleOCR (local). Returns None if not available."""
    try:
        ocr = _get_paddle_ocr()
        result = await asyncio.to_thread(ocr.ocr, image_bytes, cls=True)

        texts = []
        for line in result:
            if line:
                for word_info in line:
                    texts.append(word_info[1][0])  # Extract text content

        return "\n".join(texts) if texts else None

    except ImportError:
        logger.info("PaddleOCR not installed, skipping")
        return None
    except Exception as e:
        logger.error(f"PaddleOCR error: {e}")
        return None


async def _try_cloud_ocr(image_bytes: bytes) -> str | None:
    """Try cloud OCR API (Baidu/Tencent/OCR.space)."""
    ocr_api_key = os.getenv("OCR_API_KEY", "")
    ocr_api_secret = os.getenv("OCR_API_SECRET", "")
    ocr_endpoint = os.getenv("OCR_ENDPOINT", "")

    if not ocr_api_key:
        return None

    try:
        # OCR.space API (free tier available)
        if "ocr.space" in ocr_endpoint:
            return await _ocr_space_api(image_bytes, ocr_api_key, ocr_endpoint)

        # Baidu OCR
        if "baidu" in ocr_endpoint or "aip.baidubce.com" in ocr_endpoint:
            return await _baidu_ocr(image_bytes, ocr_api_key, ocr_api_secret, ocr_endpoint)

        # Generic POST
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                ocr_endpoint,
                headers={"Authorization": f"Bearer {ocr_api_key}"},
                data={"image": base64.b64encode(image_bytes).decode()},
            )
            if response.status_code == 200:
                data = response.json()
                return _extract_text_from_ocr_response(data)

    except Exception as e:
        logger.error(f"Cloud OCR error: {e}")
    return None


async def _ocr_space_api(image_bytes: bytes, api_key: str, endpoint: str) -> str | None:
    """OCR.space API integration."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            endpoint,
            data={
                "apikey": api_key,
                "language": "chs",  # Simplified Chinese
                "isOverlayRequired": False,
            },
            files={"file": ("screenshot.png", image_bytes, "image/png")},
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("OCRExitCode") == 1:
                return data.get("ParsedResults", [{}])[0].get("ParsedText", "")
    return None


async def _baidu_ocr(image_bytes: bytes, api_key: str, secret: str, endpoint: str) -> str | None:
    """Baidu OCR integration."""
    # First get access token
    token_url = "https://aip.baidubce.com/oauth/2.0/token"
    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.get(
            token_url,
            params={
                "grant_type": "client_credentials",
                "client_id": api_key,
                "client_secret": secret,
            },
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return None

        # Call OCR
        ocr_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={access_token}"
        ocr_resp = await client.post(
            ocr_url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={"image": base64.b64encode(image_bytes).decode()},
        )
        if ocr_resp.status_code == 200:
            ocr_data = ocr_resp.json()
            words = [w.get("words", "") for w in ocr_data.get("words_result", [])]
            return "\n".join(words) if words else None

    return None


def _extract_text_from_ocr_response(data: dict) -> str:
    """Extract text from generic OCR API response."""
    if isinstance(data, dict):
        for key in ("text", "content", "parsedText", "Text", "result"):
            if key in data:
                val = data[key]
                return val if isinstance(val, str) else json.dumps(val, ensure_ascii=False)
    return json.dumps(data, ensure_ascii=False)


async def process_screenshot(base64_image: str) -> dict:
    """
    Process a screenshot of chat conversation and extract structured dialog.

    Pipeline:
    1. OCR extracts raw text from image
    2. LLM parses raw text into structured dialog [{role, content}]

    Returns:
        {
            "raw_text": "OCR extracted text",
            "dialog": [{"role": "customer|sales", "content": "..."}],
            "confidence": 0.85,
        }
    """
    from app.services.dialog_parser import parse_dialog

    raw_text = await process_image(base64_image)

    if not raw_text:
        return {
            "raw_text": "",
            "dialog": [],
            "confidence": 0.0,
            "error": "OCR识别失败，无法提取文字",
        }

    # Use LLM to parse raw OCR text into structured dialog
    dialog_result = await parse_dialog(raw_text)

    return {
        "raw_text": raw_text,
        "dialog": dialog_result.get("dialog", []),
        "confidence": dialog_result.get("confidence", 0.8),
    }
