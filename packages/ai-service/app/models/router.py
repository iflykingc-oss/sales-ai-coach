import asyncio
import time
from typing import AsyncIterator
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

# Circuit breaker constants
_FAILURE_THRESHOLD = 3
_COOLDOWN_SECONDS = 60
_MAX_RETRIES = 3
_INITIAL_BACKOFF = 1.0


class _CircuitState:
    """Tracks circuit breaker state for a single model."""

    def __init__(self):
        self.failure_count: int = 0
        self.last_failure_time: float = 0
        self.is_open: bool = False
        self._half_open_probe: bool = False  # Limits half-open to one probe request

    def record_success(self):
        self.failure_count = 0
        self.is_open = False
        self._half_open_probe = False

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        self._half_open_probe = False
        if self.failure_count >= _FAILURE_THRESHOLD:
            self.is_open = True
            logger.warning(f"Circuit opened after {self.failure_count} consecutive failures")

    def is_available(self) -> bool:
        if not self.is_open:
            return True
        elapsed = time.monotonic() - self.last_failure_time
        if elapsed >= _COOLDOWN_SECONDS:
            # Half-open: only allow one probe request at a time
            if self._half_open_probe:
                return False  # Another request is already probing
            self._half_open_probe = True
            logger.info("Circuit half-open, allowing single probe")
            return True
        return False


class ModelRouter:
    """Routes AI requests to models with fallback and circuit breaker support."""

    def __init__(self):
        self._instances: dict[str, BaseModelAdapter] = {}
        self._primary: BaseModelAdapter | None = None
        self._fallbacks: list[BaseModelAdapter] = []
        self._circuits: dict[str, _CircuitState] = {}
        self._initialize()

    def _initialize(self):
        settings = get_settings()
        primary_name = settings.default_model
        fallback_names = settings.fallback_models

        # Create primary
        if primary_name in _MODEL_REGISTRY:
            try:
                self._primary = _MODEL_REGISTRY[primary_name]()
                self._circuits[self._primary.get_model_name()] = _CircuitState()
                logger.info(f"Primary model: {self._primary.get_model_name()}")
            except Exception as e:
                logger.warning(f"Failed to initialize primary model {primary_name}: {e}")

        # Create fallbacks
        for name in fallback_names:
            if name in _MODEL_REGISTRY:
                try:
                    adapter = _MODEL_REGISTRY[name]()
                    self._fallbacks.append(adapter)
                    self._circuits[adapter.get_model_name()] = _CircuitState()
                    logger.info(f"Fallback model: {adapter.get_model_name()}")
                except Exception as e:
                    logger.warning(f"Failed to initialize fallback model {name}: {e}")

    def _get_circuit(self, model: BaseModelAdapter) -> _CircuitState:
        name = model.get_model_name()
        if name not in self._circuits:
            self._circuits[name] = _CircuitState()
        return self._circuits[name]

    def get_primary(self) -> BaseModelAdapter:
        if not self._primary:
            raise AIServiceError("No primary model available", 503)
        return self._primary

    def get_fallbacks(self) -> list[BaseModelAdapter]:
        return self._fallbacks

    def _available_models(self) -> list[BaseModelAdapter]:
        """Return models whose circuit is not open."""
        all_models = [self._primary] + self._fallbacks if self._primary else self._fallbacks
        return [m for m in all_models if m is not None and self._get_circuit(m).is_available()]

    async def _retry_with_backoff(self, coro_factory, model_name: str):
        """Retry a coroutine with exponential backoff on 429 errors."""
        last_error = None
        backoff = _INITIAL_BACKOFF
        for attempt in range(_MAX_RETRIES):
            try:
                return await coro_factory()
            except Exception as e:
                last_error = e
                # Check for rate limit via status code attribute or HTTP 429 in message
                status_code = getattr(e, 'status_code', None) or getattr(e, 'code', None)
                err_str = str(e).lower()
                is_rate_limit = (
                    status_code == 429
                    or "429" in err_str
                    or "too many requests" in err_str
                )
                if is_rate_limit and attempt < _MAX_RETRIES - 1:
                    logger.warning(f"Rate limited on {model_name}, backoff {backoff:.1f}s (attempt {attempt + 1})")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                raise
        raise last_error  # type: ignore[misc]

    async def chat_with_fallback(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ) -> dict:
        """Try models with circuit breaker and 429 backoff."""
        models_to_try = self._available_models()
        if not models_to_try:
            # All circuits open — reset primary only to avoid overwhelming all models
            logger.warning("All circuits open, resetting primary model circuit")
            if self._primary:
                primary_circuit = self._get_circuit(self._primary)
                primary_circuit.is_open = False
                primary_circuit._half_open_probe = False
                models_to_try = [self._primary]
            else:
                models_to_try = []

        last_error = None
        for model in models_to_try:
            circuit = self._get_circuit(model)
            try:
                result = await self._retry_with_backoff(
                    lambda m=model: m.chat_complete(messages, temperature, max_tokens),
                    model.get_model_name(),
                )
                circuit.record_success()
                result["model_used"] = model.get_model_name()
                return result
            except Exception as e:
                circuit.record_failure()
                last_error = e
                logger.warning(f"Model {model.get_model_name()} failed: {e}, trying next...")
                continue

        raise AIServiceError(f"All models failed. Last error: {last_error}")

    async def chat_stream_with_fallback(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ) -> AsyncIterator[str]:
        """Stream tokens with circuit breaker support."""
        models_to_try = self._available_models()
        if not models_to_try:
            logger.warning("All circuits open, resetting and retrying all models")
            for circuit in self._circuits.values():
                circuit.is_open = False
            models_to_try = [self._primary] + self._fallbacks if self._primary else self._fallbacks
            models_to_try = [m for m in models_to_try if m is not None]

        last_error = None
        for model in models_to_try:
            circuit = self._get_circuit(model)
            try:
                async for token in model.chat_complete_stream(messages, temperature, max_tokens):
                    yield token
                circuit.record_success()
                return
            except Exception as e:
                circuit.record_failure()
                last_error = e
                logger.warning(f"Stream model {model.get_model_name()} failed: {e}, trying next...")
                continue

        raise AIServiceError(f"All streaming models failed. Last error: {last_error}")


# Singleton
model_router = ModelRouter()
