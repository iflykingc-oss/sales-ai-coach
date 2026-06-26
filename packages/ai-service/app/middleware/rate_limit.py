"""
Sliding-window rate limiter backed by Redis.

Why Redis: the previous in-memory implementation kept a list per source IP
in a single dict, allowing an attacker with N IPs to grow memory without
bound. Redis is a fixed-size sliding window that scales to many instances
and survives restarts.

Falls back to in-memory if Redis is unreachable, with a loud warning so
operators notice. This is intentional: better to keep serving than to
crash, but the fallback must be visible.
"""
import logging
import time
from collections import defaultdict
from typing import Optional

try:
    import redis.asyncio as aioredis
    _HAS_REDIS = True
except Exception:
    _HAS_REDIS = False

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """Sliding-window counter implemented with a Redis sorted set.
    ZADD/ZREMRANGEBYSCORE/ZCARD wrapped in a MULTI/EXEC pipeline."""

    def __init__(self, requests_per_minute=60, redis_url=None, key_prefix="rl:ai:"):
        self.rpm = max(1, requests_per_minute)
        self._key_prefix = key_prefix
        self._mem_fallback = defaultdict(list)
        self._redis = None
        self._using_fallback = False

        if redis_url and _HAS_REDIS:
            try:
                self._redis = aioredis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_timeout=1.0,
                    socket_connect_timeout=1.0,
                )
                logger.info(f"[rate-limit] using redis at {redis_url}")
            except Exception as e:
                logger.warning(f"[rate-limit] redis init failed: {e}; falling back to in-memory")
                self._redis = None

        if self._redis is None:
            self._using_fallback = True
            logger.warning(
                "[rate-limit] using in-memory limiter. Unsafe for multi-instance "
                "deployments and is vulnerable to memory-exhaustion DoS."
            )

    def _bucket(self, key):
        return f"{self._key_prefix}{key}"

    async def is_allowed(self, key):
        if self._redis is not None:
            return await self._is_allowed_redis(key)
        return self._is_allowed_memory(key)

    async def _is_allowed_redis(self, key):
        now = time.time()
        window_start = now - 60.0
        bucket = self._bucket(key)
        member = f"{now}:{id(self)}:{int(now*1e6)}"
        try:
            pipe = self._redis.pipeline(transaction=True)
            pipe.zremrangebyscore(bucket, "-inf", window_start)
            pipe.zadd(bucket, {member: now})
            pipe.zcard(bucket)
            pipe.expire(bucket, 90)
            _, _, count, _ = await pipe.execute()
            return int(count) <= self.rpm
        except Exception as e:
            logger.warning(f"[rate-limit] redis error: {e}; falling back to in-memory")
            self._using_fallback = True
            return self._is_allowed_memory(key)

    def _is_allowed_memory(self, key):
        now = time.time()
        window_start = now - 60.0
        bucket = self._mem_fallback[key]
        self._mem_fallback[key] = [t for t in bucket if t > window_start]
        if len(self._mem_fallback[key]) >= self.rpm:
            return False
        self._mem_fallback[key].append(now)
        return True

    async def get_remaining(self, key):
        if self._redis is not None:
            try:
                now = time.time()
                window_start = now - 60.0
                bucket = self._bucket(key)
                count = await self._redis.zcount(bucket, window_start, "+inf")
                return max(0, self.rpm - int(count))
            except Exception:
                pass
        return max(0, self.rpm - len(self._mem_fallback.get(key, [])))

    async def get_retry_after(self, key):
        if self._redis is not None:
            try:
                now = time.time()
                window_start = now - 60.0
                bucket = self._bucket(key)
                rows = await self._redis.zrangebyscore(
                    bucket, window_start, "+inf", start=0, num=1, withscores=True
                )
                if rows:
                    _, oldest = rows[0]
                    return max(1, int(oldest + 60 - now) + 1)
            except Exception:
                pass
        entries = self._mem_fallback.get(key, [])
        if not entries:
            return 0
        now = time.time()
        recent = [t for t in entries if t > now - 60]
        if not recent:
            return 0
        return max(1, int(recent[0] + 60 - now) + 1)
