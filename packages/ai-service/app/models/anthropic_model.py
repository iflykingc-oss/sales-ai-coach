from anthropic import AsyncAnthropic
from app.models.base import BaseModelAdapter
from app.core.config import get_settings
from app.core.logging import logger


class AnthropicAdapter(BaseModelAdapter):
    """Claude via Anthropic API."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model_name = "claude-sonnet-4-6-20250514"

    async def chat_complete(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048, stream: bool = False
    ) -> dict:
        system_msg = ""
        user_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_msg = msg.get("content", "")
            else:
                user_messages.append(msg)

        response = await self.client.messages.create(
            model=self.model_name,
            system=system_msg,
            messages=user_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return {
            "content": response.content[0].text if response.content else "",
            "usage": {"prompt_tokens": response.usage.input_tokens, "completion_tokens": response.usage.output_tokens},
        }

    async def chat_complete_stream(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ):
        system_msg = ""
        user_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_msg = msg.get("content", "")
            else:
                user_messages.append(msg)

        async with self.client.messages.stream(
            model=self.model_name,
            system=system_msg,
            messages=user_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    def get_model_name(self) -> str:
        return self.model_name
