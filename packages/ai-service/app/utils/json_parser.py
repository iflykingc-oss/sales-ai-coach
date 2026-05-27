import json
import re
from typing import Any


def extract_json(text: str) -> dict | None:
    """Extract JSON from LLM output, handling various formats."""
    if not text:
        return None

    # Try 1: Parse as-is
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try 2: Extract from markdown code block
    code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try 3: Find first { to last }
    brace_start = text.find('{')
    brace_end = text.rfind('}')
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        try:
            return json.loads(text[brace_start:brace_end + 1])
        except json.JSONDecodeError:
            pass

    return None
