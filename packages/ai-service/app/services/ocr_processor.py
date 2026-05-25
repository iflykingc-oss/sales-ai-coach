import base64
import httpx
from app.core.logging import logger

OCR_ENDPOINT = "https://api.ocr.space/parse/image"


async def process_image(image_data: str) -> str:
    """Extract text from image using OCR.

    Args:
        image_data: Base64 encoded image or URL
    """
    try:
        # For now, return a placeholder. In production, integrate with
        # PaddleOCR (local) or cloud OCR API
        if image_data.startswith("http"):
            # Download image from URL
            async with httpx.AsyncClient() as client:
                response = await client.get(image_data)
                image_bytes = response.content
        else:
            image_bytes = base64.b64decode(image_data)

        logger.info(f"Processing image OCR, size: {len(image_bytes)} bytes")

        # TODO: Integrate PaddleOCR or cloud OCR API
        # For now, return placeholder
        return "[OCR识别结果] 图片内容待识别"

    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        raise


async def process_screenshot(base64_image: str) -> dict:
    """Process a screenshot of chat conversation and extract dialog.

    Returns structured dialog from chat screenshots.
    """
    text = await process_image(base64_image)

    # Use AI to parse the extracted text into structured dialog
    from app.models.router import model_router

    messages = [
        {
            "role": "system",
            "content": "你是一个对话内容解析专家。请将以下OCR识别的聊天对话转换为结构化的对话记录，识别出说话人角色和每句话的内容。输出JSON格式：[{\"role\": \"customer|sales\", \"content\": \"内容\"}]",
        },
        {"role": "user", "content": text},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=1024)

    return {"raw_text": text, "parsed_dialog": result["content"]}
