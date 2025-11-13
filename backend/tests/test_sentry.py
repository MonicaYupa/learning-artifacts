"""
Tests for Sentry integration

These tests verify that:
1. User IDs are properly hashed before being sent to Sentry (privacy protection)
2. Context information is properly set for debugging
3. The middleware correctly extracts and sets context from requests
4. Error cases are handled gracefully without breaking the application
"""

import os
from unittest.mock import MagicMock

import pytest


class TestSentryContextHelpers:
    """Test the Sentry context helper functions"""

    def test_set_user_context_hashes_id(self, mock_sentry_sdk):
        """User IDs should be hashed for privacy protection"""
        from middleware.sentry_context import set_sentry_user_context

        user_id = "user-123"
        set_sentry_user_context(user_id)

        # Verify set_user was called once
        mock_sentry_sdk.set_user.assert_called_once()

        # Verify the ID is hashed (32-character hex string)
        call_args = mock_sentry_sdk.set_user.call_args[0][0]
        assert "id" in call_args
        hashed_id = call_args["id"]
        assert len(hashed_id) == 32
        assert all(c in "0123456789abcdef" for c in hashed_id)

        # Verify the hash is deterministic
        from middleware.sentry_context import _hash_id

        expected_hash = _hash_id(user_id)
        assert hashed_id == expected_hash

    def test_set_module_context_hashes_id(self, mock_sentry_sdk):
        """Module IDs should be hashed for privacy protection"""
        from middleware.sentry_context import set_sentry_module_context

        module_id = "module-456"
        set_sentry_module_context(module_id)

        # Verify set_context was called with proper structure
        mock_sentry_sdk.set_context.assert_called_once()
        context_name, context_data = mock_sentry_sdk.set_context.call_args[0]

        assert context_name == "module"
        assert "module_id_hash" in context_data

        # Verify the hash is a 32-character hex string
        hashed_id = context_data["module_id_hash"]
        assert len(hashed_id) == 32
        assert all(c in "0123456789abcdef" for c in hashed_id)

    def test_set_session_context_hashes_id(self, mock_sentry_sdk):
        """Session IDs should be hashed for privacy protection"""
        from middleware.sentry_context import set_sentry_session_context

        session_id = "session-789"
        set_sentry_session_context(session_id)

        # Verify set_context was called with proper structure
        mock_sentry_sdk.set_context.assert_called_once()
        context_name, context_data = mock_sentry_sdk.set_context.call_args[0]

        assert context_name == "session"
        assert "session_id_hash" in context_data

        # Verify the hash is a 32-character hex string
        hashed_id = context_data["session_id_hash"]
        assert len(hashed_id) == 32
        assert all(c in "0123456789abcdef" for c in hashed_id)

    def test_hash_id_is_deterministic(self):
        """Hash function should produce consistent results"""
        from middleware.sentry_context import _hash_id

        test_id = "test-id-123"

        # Same input should produce same output
        hash1 = _hash_id(test_id)
        hash2 = _hash_id(test_id)
        assert hash1 == hash2

        # Different inputs should produce different outputs
        different_id = "test-id-456"
        hash3 = _hash_id(different_id)
        assert hash1 != hash3


class TestSentryMiddleware:
    """Test the Sentry context middleware"""

    @pytest.mark.asyncio
    async def test_middleware_sets_user_context(self, mock_sentry_sdk):
        """Middleware should extract and set user context from request state"""
        from middleware.sentry_context import SentryContextMiddleware

        # Create a mock request with user state
        mock_request = MagicMock()
        mock_request.state.user = {"user_id": "user-123"}
        mock_request.query_params = {}
        mock_request.headers = {}
        mock_request.url.path = "/api/test"
        mock_request.method = "GET"

        # Create middleware instance
        middleware = SentryContextMiddleware(app=MagicMock())

        # Create mock call_next
        async def mock_call_next(request):
            return MagicMock()

        # Process request
        await middleware.dispatch(mock_request, mock_call_next)

        # Verify user context was set with hashed ID
        mock_sentry_sdk.set_user.assert_called_once()
        user_data = mock_sentry_sdk.set_user.call_args[0][0]
        assert "id" in user_data
        assert len(user_data["id"]) == 32

    @pytest.mark.asyncio
    async def test_middleware_handles_missing_user(self, mock_sentry_sdk):
        """Middleware should handle requests without user context gracefully"""
        from middleware.sentry_context import SentryContextMiddleware

        # Create a mock request without user state
        mock_request = MagicMock()
        delattr(mock_request.state, "user")
        mock_request.query_params = {}
        mock_request.headers = {}
        mock_request.url.path = "/api/test"
        mock_request.method = "GET"

        # Create middleware instance
        middleware = SentryContextMiddleware(app=MagicMock())

        # Create mock call_next
        async def mock_call_next(request):
            return MagicMock()

        # Process request - should not raise an error
        response = await middleware.dispatch(mock_request, mock_call_next)
        assert response is not None

        # Verify set_user was not called when no user is present
        mock_sentry_sdk.set_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_middleware_sets_request_context(self, mock_sentry_sdk):
        """Middleware should always set request path and method context"""
        from middleware.sentry_context import SentryContextMiddleware

        # Create a mock request
        mock_request = MagicMock()
        delattr(mock_request.state, "user")  # No user
        mock_request.query_params = {}
        mock_request.headers = {}
        mock_request.url.path = "/api/modules"
        mock_request.method = "POST"

        # Create middleware instance
        middleware = SentryContextMiddleware(app=MagicMock())

        # Create mock call_next
        async def mock_call_next(request):
            return MagicMock()

        # Process request
        await middleware.dispatch(mock_request, mock_call_next)

        # Verify request context was set
        assert mock_sentry_sdk.set_context.called
        # Find the call that set request context
        request_context_call = None
        for call in mock_sentry_sdk.set_context.call_args_list:
            if call[0][0] == "request":
                request_context_call = call
                break

        assert request_context_call is not None
        context_data = request_context_call[0][1]
        assert context_data["path"] == "/api/modules"
        assert context_data["method"] == "POST"
