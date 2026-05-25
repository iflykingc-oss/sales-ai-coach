from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.logging import logger
from app.routes import router

app = FastAPI(
    title="Sales AI Coach - AI Service",
    description="Multi-model AI proxy service for the Sales AI Coach platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup():
    logger.info("AI Service starting up...")


@app.on_event("shutdown")
async def shutdown():
    logger.info("AI Service shutting down...")
