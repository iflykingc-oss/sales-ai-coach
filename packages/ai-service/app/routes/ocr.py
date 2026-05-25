from fastapi import APIRouter, UploadFile, File
from app.services.ocr_processor import process_image, process_screenshot

router = APIRouter()


@router.post("/image")
async def ocr_image(file: UploadFile = File(...)):
    """Extract text from uploaded image."""
    content = await file.read()
    import base64
    b64 = base64.b64encode(content).decode()
    text = await process_image(b64)
    return {"success": True, "data": {"text": text}}


@router.post("/screenshot")
async def ocr_screenshot(file: UploadFile = File(...)):
    """Process chat screenshot and extract structured dialog."""
    content = await file.read()
    import base64
    b64 = base64.b64encode(content).decode()
    result = await process_screenshot(b64)
    return {"success": True, "data": result}
