"""
Embedding Service — 统一嵌入服务

参照 FlagOpen/FlagEmbedding (11.9K stars) 的 BGE-M3 模型，
支持 DashScope text-embedding-v3 作为 API 备选。

优先级：BGE-M3 TEI > DashScope > Fallback（字符 bigram）

LRU cache: 使用 OrderedDict 实现异步安全的 LRU 缓存，
避免相同文本重复调用 API。
"""

import hashlib
import math
from collections import OrderedDict
from app.core.config import get_settings
from app.core.logging import logger

# Target dimension for pgvector storage (DashScope text-embedding-v3)
EMBEDDING_DIM = 1024


class EmbeddingService:
    """Unified embedding service with LRU cache and multiple backends."""

    def __init__(self, cache_size: int = 2048):
        self.settings = get_settings()
        self._cache: OrderedDict[str, list[float]] = OrderedDict()
        self._cache_size = cache_size

    def _cache_get(self, key: str) -> list[float] | None:
        """Get from LRU cache, promoting to front on hit."""
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def _cache_put(self, key: str, value: list[float]) -> None:
        """Put into LRU cache, evicting oldest if at capacity."""
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._cache_size:
                self._cache.popitem(last=False)
        self._cache[key] = value

    async def embed(self, text: str) -> list[float]:
        """Get embedding vector for a single text."""
        cache_key = text.strip()[:2000]  # Normalize for cache key
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        embedding = None

        # Try DashScope text-embedding-v3 (API, no infra needed)
        if self.settings.qwen_api_key:
            embedding = await self._try_dashscope_embedding(text)

        # Fallback: character bigram hash (64-dim, no API needed)
        if embedding is None:
            embedding = self._fallback_embedding(text)

        self._cache_put(cache_key, embedding)
        return embedding

    async def embed_for_storage(self, text: str) -> list[float]:
        """Get embedding vector normalized to EMBEDDING_DIM for pgvector storage.

        Pads shorter vectors with zeros, truncates longer ones.
        """
        embedding = await self.embed(text)
        return self._normalize_dim(embedding)

    @staticmethod
    def _normalize_dim(embedding: list[float]) -> list[float]:
        """Normalize embedding to EMBEDDING_DIM (pad with zeros or truncate)."""
        if len(embedding) == EMBEDDING_DIM:
            return embedding
        if len(embedding) < EMBEDDING_DIM:
            return embedding + [0.0] * (EMBEDDING_DIM - len(embedding))
        return embedding[:EMBEDDING_DIM]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Get embeddings for multiple texts."""
        # DashScope supports batch API
        if self.settings.qwen_api_key:
            try:
                return await self._dashscope_batch(texts)
            except Exception as e:
                logger.warning(f"[embedding] Batch API failed: {e}")

        # Fallback: individual calls
        return [await self.embed(t) for t in texts]

    async def _try_dashscope_embedding(self, text: str) -> list[float] | None:
        """Try DashScope text-embedding-v3 API."""
        try:
            import aiohttp

            url = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding"
            headers = {
                "Authorization": f"Bearer {self.settings.qwen_api_key}",
                "Content-Type": "application/json",
            }
            body = {
                "model": "text-embedding-v3",
                "input": {"texts": [text[:2000]]},  # Truncate to 2000 chars
                "parameters": {"dimension": 1024},
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    data = await resp.json()
                    embeddings = data.get("output", {}).get("embeddings", [])
                    if embeddings:
                        return embeddings[0].get("embedding", [])
        except Exception as e:
            logger.warning(f"[embedding] DashScope failed: {e}")
        return None

    async def _dashscope_batch(self, texts: list[str]) -> list[list[float]]:
        """DashScope batch embedding API."""
        import aiohttp

        url = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding"
        headers = {
            "Authorization": f"Bearer {self.settings.qwen_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "text-embedding-v3",
            "input": {"texts": [t[:2000] for t in texts[:25]]},  # Max 25 per batch
            "parameters": {"dimension": 1024},
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                data = await resp.json()
                embeddings = data.get("output", {}).get("embeddings", [])
                # Sort by text_index
                sorted_embeddings = sorted(embeddings, key=lambda e: e.get("text_index", 0))
                return [e.get("embedding", []) for e in sorted_embeddings]

    def _fallback_embedding(self, text: str) -> list[float]:
        """Fallback: character bigram frequency hash (64-dim).

        质量低于专用嵌入模型，但无需 API 调用。
        用于开发/测试或 API 不可用时的降级。
        """
        dim = 64
        vector = [0.0] * dim

        # Character bigrams
        for i in range(len(text) - 1):
            bigram = text[i:i+2]
            h = int(hashlib.md5(bigram.encode()).hexdigest(), 16)
            idx = h % dim
            vector[idx] += 1.0

        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]

        return vector

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        # Pad to same length
        max_len = max(len(a), len(b))
        a = a + [0.0] * (max_len - len(a))
        b = b + [0.0] * (max_len - len(b))

        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))

        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


# Singleton
embedding_service = EmbeddingService()
