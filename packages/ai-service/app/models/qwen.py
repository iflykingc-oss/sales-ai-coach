from openai import AsyncOpenAI
from app.models.base import BaseModelAdapter
from app.core.config import get_settings
from app.core.logging import logger


class QwenAdapter(BaseModelAdapter):
    """Qwen model via OpenAI-compatible API."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(
            api_key=settings.qwen_api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            timeout=60.0,
        )
        self.model_name = "qwen-plus"

    async def chat_complete(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048, stream: bool = False
    ) -> dict:
        try:
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
        except Exception as e:
            logger.error(f"Qwen API error: {e}")
            raise

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
