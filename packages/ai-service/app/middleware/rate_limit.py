import time
from collections import defaultdict

from fastapi import Request, HTTPException


class SlidingWindowRateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - 60
        # Clean old entries
        self._requests[key] = [t for t in self._requests[key] if t > window_start]
        if len(self._requests[key]) >= self.rpm:
            return False
        self._requests[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        now = time.time()
        window_start = now - 60
        recent = [t for t in self._requests[key] if t > window_start]
        return max(0, self.rpm - len(recent))

    def get_retry_after(self, key: str) -> int:
        """Return seconds until the oldest request in the window expires."""
        if not self._requests[key]:
            return 0
        now = time.time()
        window_start = now - 60
        recent = [t for t in self._requests[key] if t > window_start]
        if not recent:
            return 0
        return max(1, int(recent[0] + 60 - now) + 1)
