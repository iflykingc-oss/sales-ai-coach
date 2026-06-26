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

    # IM Integration (Feishu/DingTalk)
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_verification_token: str = ""
    feishu_encrypt_key: str = ""
    feishu_allow_unencrypted: bool = False

    dingtalk_client_id: str = ""
    dingtalk_client_secret: str = ""
    dingtalk_app_secret: str = ""

    # Feature flags
    use_langgraph_coaching: bool = False

    # AI Service auth (shared secret for inbound API calls, separate from cookies)
    ai_service_api_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
