class AIServiceError(Exception):
    """Base error for AI service operations."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ModelUnavailableError(AIServiceError):
    def __init__(self, model_name: str):
        super().__init__(f"Model '{model_name}' is not available", 503)


class RateLimitError(AIServiceError):
    def __init__(self, retry_after: int = 60):
        super().__init__(f"Rate limit exceeded. Retry after {retry_after}s", 429)
        self.retry_after = retry_after


class PromptError(AIServiceError):
    def __init__(self, message: str):
        super().__init__(f"Prompt error: {message}", 400)
