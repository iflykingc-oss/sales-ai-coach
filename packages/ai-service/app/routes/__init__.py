from fastapi import APIRouter

from app.routes import health, scripts, practices, knowledge, reviews, ocr

router = APIRouter(prefix="/api")
router.include_router(health.router, tags=["health"])
router.include_router(scripts.router, prefix="/scripts", tags=["scripts"])
router.include_router(practices.router, prefix="/practices", tags=["practices"])
router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
router.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
