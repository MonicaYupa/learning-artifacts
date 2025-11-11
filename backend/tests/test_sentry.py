"""
Tests for Sentry integration
"""

import os
from unittest.mock import MagicMock, patch

import pytest


class TestSentryCustomContext:
    """Test custom context integration with Sentry"""

    @patch("sentry_sdk.set_user")
    def test_set_user_context(self, mock_set_user):
        """Test setting user context with hashed ID"""
        from middleware.sentry_context import set_sentry_user_context

        user_id = "user-123"
        set_sentry_user_context(user_id)

        # Verify set_user was called with hashed ID
        mock_set_user.assert_called_once()
        call_args = mock_set_user.call_args
        assert "id" in call_args[0][0]
        # Verify the ID is a 32-character hex hash
        hashed_id = call_args[0][0]["id"]
        assert len(hashed_id) == 32
        assert all(c in "0123456789abcdef" for c in hashed_id)

    @patch("sentry_sdk.set_context")
    def test_set_module_context(self, mock_set_context):
        """Test setting module context with hashed ID"""
        from middleware.sentry_context import set_sentry_module_context

        module_id = "module-456"
        set_sentry_module_context(module_id)

        # Verify set_context was called with hashed ID
        mock_set_context.assert_called_once()
        call_args = mock_set_context.call_args
        assert call_args[0][0] == "module"
        assert "module_id_hash" in call_args[0][1]

    @patch("sentry_sdk.set_context")
    def test_set_session_context(self, mock_set_context):
        """Test setting session context with hashed ID"""
        from middleware.sentry_context import set_sentry_session_context

        session_id = "session-789"
        set_sentry_session_context(session_id)

        # Verify set_context was called with hashed ID
        mock_set_context.assert_called_once()
        call_args = mock_set_context.call_args
        assert call_args[0][0] == "session"
        assert "session_id_hash" in call_args[0][1]

    @pytest.mark.asyncio
    @patch("sentry_sdk.set_context")
    @patch("sentry_sdk.set_user")
    async def test_middleware_extracts_user_id_from_request(
        self, mock_set_user, mock_set_context
    ):
        """Test that middleware extracts user_id from request state and hashes it"""
        from fastapi import Request
        from middleware.sentry_context import SentryContextMiddleware

        # Create a mock request with user state
        mock_request = MagicMock(spec=Request)
        mock_request.state.user = {"user_id": "user-123"}
        mock_request.query_params = {}
        mock_request.headers = {}
        mock_request.url = MagicMock()
        mock_request.url.path = "/test"
        mock_request.method = "GET"

        # Create a mock call_next function
        async def mock_call_next(request):
            return MagicMock()

        # Create middleware instance
        middleware = SentryContextMiddleware(app=MagicMock())

        # Process the request
        await middleware.dispatch(mock_request, mock_call_next)

        # Verify set_user was called with hashed user ID
        mock_set_user.assert_called_once()
        user_data = mock_set_user.call_args[0][0]
        assert "id" in user_data
        # Verify the ID is a 32-character hex hash
        assert len(user_data["id"]) == 32
        assert all(c in "0123456789abcdef" for c in user_data["id"])

    @pytest.mark.asyncio
    @patch("sentry_sdk.set_user")
    @patch("sentry_sdk.set_context")
    async def test_middleware_handles_missing_user_gracefully(
        self, mock_set_context, mock_set_user
    ):
        """Test that middleware handles requests without user context"""
        from fastapi import Request
        from middleware.sentry_context import SentryContextMiddleware

        # Create a mock request without user state
        mock_request = MagicMock(spec=Request)
        # Don't set the user attribute at all to simulate missing user
        delattr(mock_request.state, "user")
        mock_request.query_params = {}
        mock_request.headers = {}
        mock_request.url = MagicMock()
        mock_request.url.path = "/test"
        mock_request.method = "GET"

        # Create a mock call_next function
        async def mock_call_next(request):
            return MagicMock()

        # Create middleware instance
        middleware = SentryContextMiddleware(app=MagicMock())

        # Process the request - should not raise an error
        response = await middleware.dispatch(mock_request, mock_call_next)
        assert response is not None
        # Verify set_user was not called when no user is present
        mock_set_user.assert_not_called()
