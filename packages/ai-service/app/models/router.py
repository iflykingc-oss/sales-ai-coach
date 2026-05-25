from app.models.base import BaseModelAdapter
from app.models.qwen import QwenAdapter
from app.models.openai_model import OpenAIAdapter
from app.models.anthropic_model import AnthropicAdapter
from app.models.minimax import MinimaxAdapter
from app.core.config import get_settings
from app.core.logging import logger
from app.core.exceptions import AIServiceError

_MODEL_REGISTRY: dict[str, type[BaseModelAdapter]] = {
    "qwen": QwenAdapter,
    "openai": OpenAIAdapter,
    "anthropic": AnthropicAdapter,
    "minimax": MinimaxAdapter,
}


class ModelRouter:
    """Routes AI requests to models with fallback support."""

    def __init__(self):
        self._instances: dict[str, BaseModelAdapter] = {}
        self._primary: BaseModelAdapter | None = None
        self._fallbacks: list[BaseModelAdapter] = []
        self._initialize()

    def _initialize(self):
        settings = get_settings()
        primary_name = settings.default_model
        fallback_names = settings.fallback_models

        # Create primary
        if primary_name in _MODEL_REGISTRY:
            try:
                self._primary = _MODEL_REGISTRY[primary_name]()
                logger.info(f"Primary model: {self._primary.get_model_name()}")
            except Exception as e:
                logger.warning(f"Failed to initialize primary model {primary_name}: {e}")

        # Create fallbacks
        for name in fallback_names:
            if name in _MODEL_REGISTRY:
                try:
                    adapter = _MODEL_REGISTRY[name]()
                    self._fallbacks.append(adapter)
                    logger.info(f"Fallback model: {adapter.get_model_name()}")
                except Exception as e:
                    logger.warning(f"Failed to initialize fallback model {name}: {e}")

    def get_primary(self) -> BaseModelAdapter:
        if not self._primary:
            raise AIServiceError("No primary model available", 503)
        return self._primary

    def get_fallbacks(self) -> list[BaseModelAdapter]:
        return self._fallbacks

    async def chat_with_fallback(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ) -> dict:
        """Try primary model first, then fallbacks on error."""
        models_to_try = [self._primary] + self._fallbacks if self._primary else self._fallbacks
        models_to_try = [m for m in models_to_try if m is not None]

        last_error = None
        for model in models_to_try:
            try:
                result = await model.chat_complete(messages, temperature, max_tokens)
                result["model_used"] = model.get_model_name()
                return result
            except Exception as e:
                last_error = e
                logger.warning(f"Model {model.get_model_name()} failed: {e}, trying next...")
                continue

        raise AIServiceError(f"All models failed. Last error: {last_error}")


# Singleton
model_router = ModelRouter()
