"""
Inbound authentication for the AI service.

The AI service is reachable from the public internet if misconfigured
(no auth today). This module provides a simple shared-secret check that
the upstream `api` service passes via the `x-api-key` header.

Endpoints that must stay public (health checks, IM webhooks) are excluded
explicitly; webhooks have their own signature verification.
"""
import hashlib
import hmac
from typing import Iterable, Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.core.logging import logger


# Paths that bypass auth (have their own security, or are public probes)
_DEFAULT_EXEMPT_PATHS = frozenset({
    "/health",
    "/healthz",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/feishu/webhook",
    "/dingtalk/webhook",
})


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        api_key: str,
        exempt_paths: Optional[Iterable[str]] = None,
    ) -> None:
        super().__init__(app)
        self._expected = api_key.encode("utf-8") if api_key else b""
        self._exempt = frozenset(exempt_paths) if exempt_paths else _DEFAULT_EXEMPT_PATHS

    async def dispatch(self, request: Request, call_next):
        # If auth is disabled (no key configured), do not silently let
        # everyone in. Log a loud warning so this is caught at startup.
        if not self._expected:
            logger.warning(
                "[ai-auth] AI_SERVICE_API_KEY is not configured. "
                "All /v1 endpoints are currently UNAUTHENTICATED. "
                "Set AI_SERVICE_API_KEY in the environment."
            )
            return await call_next(request)

        path = request.url.path
        if path in self._exempt or any(path.startswith(p + "/") for p in self._exempt):
            return await call_next(request)

        provided = request.headers.get("x-api-key", "")
        if not provided:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "missing x-api-key header"},
            )
        if not hmac.compare_digest(
            hashlib.sha256(provided.encode("utf-8")).digest(),
            hashlib.sha256(self._expected).digest(),
        ):
            logger.warning(f"[ai-auth] rejected call to {path} (key mismatch)")
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "invalid x-api-key"},
            )

        return await call_next(request)
