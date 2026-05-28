from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Server
    app_name: str = "Sales AI Coach AI Service"
    debug: bool = False

    # AI Model API Keys
    minimax_api_key: str = ""
    minimax_group_id: str = ""
    qwen_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Model Configuration
    default_model: str = "qwen"
    fallback_models: list[str] = ["openai", "anthropic"]

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Rate Limiting
    requests_per_minute: int = 60

    # OCR
    ocr_api_key: str = ""
    ocr_api_secret: str = ""
    ocr_endpoint: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
