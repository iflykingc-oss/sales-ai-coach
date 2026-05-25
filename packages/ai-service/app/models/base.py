from abc import ABC, abstractmethod
from typing import AsyncIterator


class Message(dict):
    role: str
    content: str


class BaseModelAdapter(ABC):
    """Abstract interface for LLM model adapters."""

    @abstractmethod
    async def chat_complete(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = False,
    ) -> dict:
        """Generate a chat completion. Returns {"content": str, "usage": dict}."""
        pass

    @abstractmethod
    async def chat_complete_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        """Stream chat completion tokens."""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the model identifier."""
        pass
