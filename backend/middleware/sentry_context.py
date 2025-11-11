"""
Sentry Context Middleware
Adds custom context (user_id, module_id, session_id) to Sentry events
"""

import hashlib

import sentry_sdk
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


def _hash_id(id_value: str) -> str:
    """
    Hash an ID value for privacy protection in Sentry
    Uses SHA-256 to create a consistent but anonymized identifier

    Args:
        id_value: The ID to hash

    Returns:
        Hashed ID (first 32 characters of SHA-256 hex digest)
    """
    if not isinstance(id_value, str):
        id_value = str(id_value)
    return hashlib.sha256(id_value.encode()).hexdigest()[:32]


def set_sentry_user_context(user_id: str) -> None:
    """
    Set user context in Sentry with hashed ID for privacy

    Args:
        user_id: The user ID to add to Sentry context (will be hashed)
    """
    hashed_id = _hash_id(user_id)
    # Use set_user for proper user identification in Sentry
    sentry_sdk.set_user({"id": hashed_id})


def set_sentry_module_context(module_id: str) -> None:
    """
    Set module context in Sentry with hashed ID for privacy

    Args:
        module_id: The module ID to add to Sentry context (will be hashed)
    """
    hashed_id = _hash_id(module_id)
    sentry_sdk.set_context("module", {"module_id_hash": hashed_id})


def set_sentry_session_context(session_id: str) -> None:
    """
    Set session context in Sentry with hashed ID for privacy

    Args:
        session_id: The session ID to add to Sentry context (will be hashed)
    """
    hashed_id = _hash_id(session_id)
    sentry_sdk.set_context("session", {"session_id_hash": hashed_id})


class SentryContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically add custom context to Sentry events

    Extracts user_id, module_id, and session_id from request state and headers
    and adds them to Sentry context for better error tracking
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Process the request and add context to Sentry

        Args:
            request: The incoming request
            call_next: The next middleware/route handler

        Returns:
            The response from the next handler
        """
        # Extract user_id from request state (set by auth middleware)
        try:
            if hasattr(request.state, "user") and request.state.user:
                user_id = request.state.user.get("user_id")
                if user_id:
                    set_sentry_user_context(user_id)
        except (AttributeError, TypeError):
            # No user in request state
            pass

        # Extract module_id from query params or headers
        module_id = request.query_params.get("module_id") or request.headers.get(
            "X-Module-ID"
        )
        if module_id:
            set_sentry_module_context(module_id)

        # Extract session_id from query params or headers
        session_id = request.query_params.get("session_id") or request.headers.get(
            "X-Session-ID"
        )
        if session_id:
            set_sentry_session_context(session_id)

        # Add request path to context
        sentry_sdk.set_context(
            "request",
            {"path": request.url.path, "method": request.method},
        )

        # Process the request - exceptions are automatically captured by Sentry's FastAPI integration
        return await call_next(request)
