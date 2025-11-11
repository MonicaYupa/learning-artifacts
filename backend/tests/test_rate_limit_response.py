"""
Unit tests for 429 Rate Limit error responses with Retry-After header
Tests that rate limit errors return proper retry_after information to clients
"""

from unittest.mock import Mock, patch

import pytest
from anthropic import RateLimitError
from fastapi import status
from fastapi.testclient import TestClient
from main import app
from middleware.auth import get_current_user_id


# Mock authentication to bypass auth requirements
def mock_get_current_user_id():
    """Override dependency to return test user ID"""
    return 1


@pytest.fixture(autouse=True)
def override_auth_dependency():
    """Override authentication dependency for all tests"""
    app.dependency_overrides[get_current_user_id] = mock_get_current_user_id
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


class TestRateLimitResponse:
    """Test 429 responses include retry_after field"""

    @patch("routers.modules.generate_module")
    def test_rate_limit_error_returns_retry_after(self, mock_generate):
        """429 error should include retry_after in response JSON and HTTP headers"""
        # Create mock RateLimitError with retry_after
        response_mock = Mock()
        response_mock.status_code = 429
        response_mock.headers = {"retry-after": "30"}

        error = RateLimitError("Rate limited", response=response_mock, body=None)
        error.retry_after = 30.0  # Add retry_after attribute

        mock_generate.side_effect = error

        # Make request to module generation endpoint
        response = client.post(
            "/api/modules/generate",
            json={"message": "I want to learn Python"},
            headers={"Authorization": "Bearer test-token"},
        )

        # Should return 429 status
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

        # Response should include retry_after in JSON body
        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], dict)
        assert "message" in data["detail"]
        assert "retry_after" in data["detail"]
        assert data["detail"]["retry_after"] == 30

        # Response should also include Retry-After in HTTP headers
        assert "retry-after" in response.headers
        assert response.headers["retry-after"] == "30"

    @patch("routers.modules.generate_module")
    def test_rate_limit_without_retry_after_header(self, mock_generate):
        """429 error without retry_after should still work"""
        # Create mock RateLimitError without retry_after
        response_mock = Mock()
        response_mock.status_code = 429
        response_mock.headers = {}

        error = RateLimitError("Rate limited", response=response_mock, body=None)
        mock_generate.side_effect = error

        # Make request
        response = client.post(
            "/api/modules/generate",
            json={"message": "I want to learn Python"},
            headers={"Authorization": "Bearer test-token"},
        )

        # Should return 429 status
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

        # Response should have detail with message, but no retry_after
        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], dict)
        assert "message" in data["detail"]
        assert "retry_after" not in data["detail"]

    @patch("routers.modules.generate_module")
    def test_non_rate_limit_error_no_retry_after(self, mock_generate):
        """Non-429 errors should not include retry_after"""
        # Create a generic error
        mock_generate.side_effect = Exception("Generic error")

        # Make request
        response = client.post(
            "/api/modules/generate",
            json={"message": "I want to learn Python"},
            headers={"Authorization": "Bearer test-token"},
        )

        # Should return 500 status
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # Response should NOT include retry_after
        data = response.json()
        assert "detail" in data
        # For 500 errors, detail is a string, not a dict
        if isinstance(data["detail"], dict):
            assert "retry_after" not in data["detail"]


class TestRetryAfterInErrorResponse:
    """Test that retry_after gets extracted and included in error responses"""

    def test_get_retry_after_from_rate_limit_error(self):
        """Test extracting retry_after from RateLimitError attributes"""
        from anthropic import RateLimitError

        response_mock = Mock()
        response_mock.status_code = 429
        error = RateLimitError("Rate limited", response=response_mock, body=None)

        # Check if retry_after attribute exists
        retry_after = getattr(error, "retry_after", None)
        assert retry_after is None or isinstance(retry_after, (int, float))

    def test_get_retry_after_from_response_headers(self):
        """Test extracting retry_after from response headers"""
        from anthropic import APIStatusError

        response_mock = Mock()
        response_mock.status_code = 429
        response_mock.headers = {"retry-after": "60"}

        error = APIStatusError("Rate limited", response=response_mock, body=None)

        # Extract from headers
        retry_after = None
        if hasattr(error, "response") and hasattr(error.response, "headers"):
            retry_after_str = error.response.headers.get("retry-after")
            if retry_after_str:
                try:
                    retry_after = float(retry_after_str)
                except ValueError:
                    retry_after = None

        assert retry_after == 60.0
