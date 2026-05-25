from app.models.qwen import QwenAdapter
from app.models.base import BaseModelAdapter
from app.core.config import get_settings
from app.core.logging import logger


class OpenAIAdapter(BaseModelAdapter):
    """GPT-4o via OpenAI API (alias for qwen structure)."""

    def __init__(self):
        settings = get_settings()
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model_name = "gpt-4o"

    async def chat_complete(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048, stream: bool = False
    ) -> dict:
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return {
            "content": response.choices[0].message.content or "",
            "usage": response.usage.model_dump() if response.usage else {},
        }

    async def chat_complete_stream(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ):
        stream = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_model_name(self) -> str:
        return self.model_name
