import re


def sanitize_user_input(text: str, max_length: int = 5000) -> str:
    """Sanitize user input for safe inclusion in LLM prompts."""
    if not text:
        return ""
    # Truncate
    text = text[:max_length]
    # Remove common injection patterns
    injection_patterns = [
        r'\[INST\]', r'\[/INST\]', r'<<SYS>>', r'<</SYS>>',
        r'IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS',
        r'You\s+are\s+now\s+',
        r'SYSTEM\s*:',
        r'ASSISTANT\s*:',
    ]
    for pattern in injection_patterns:
        text = re.sub(pattern, '[FILTERED]', text, flags=re.IGNORECASE)
    return text


def wrap_user_input(text: str, max_length: int = 5000) -> str:
    """Wrap sanitized user input with clear boundary markers."""
    clean = sanitize_user_input(text, max_length)
    return f'"""用户输入开始\n{clean}\n用户输入结束"""'
