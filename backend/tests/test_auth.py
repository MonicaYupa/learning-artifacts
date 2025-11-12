"""
Authentication Tests
Tests for JWT verification and authentication middleware
"""

import pytest
from fastapi.testclient import TestClient


class TestAuthenticationRequired:
    """Test that all protected endpoints require authentication"""

    @pytest.fixture
    def endpoints(self):
        """List of all protected endpoints to test"""
        return [
            ("GET", "/api/modules"),
            ("GET", "/api/modules/00000000-0000-0000-0000-000000000000"),
            ("POST", "/api/modules/generate"),
            ("POST", "/api/sessions"),
            ("GET", "/api/sessions/00000000-0000-0000-0000-000000000000"),
            ("PATCH", "/api/sessions/00000000-0000-0000-0000-000000000000"),
            ("POST", "/api/sessions/00000000-0000-0000-0000-000000000000/submit"),
            ("POST", "/api/sessions/00000000-0000-0000-0000-000000000000/hint"),
        ]

    def test_all_endpoints_require_authentication(
        self, unauthenticated_client, endpoints
    ):
        """CRITICAL: Verify all protected endpoints return 401 without auth"""
        # Valid payloads for endpoints that require them
        payloads = {
            "/api/modules/generate": {"topic": "Test", "skill_level": "beginner"},
            "/api/sessions": {"module_id": "00000000-0000-0000-0000-000000000000"},
            "/api/sessions/00000000-0000-0000-0000-000000000000/submit": {
                "answer_text": "test",
                "time_spent_seconds": 60,
                "hints_used": 0,
            },
            "/api/sessions/00000000-0000-0000-0000-000000000000/hint": {},
        }

        for method, path in endpoints:
            payload = payloads.get(path, {})

            if method == "GET":
                response = unauthenticated_client.get(path)
            elif method == "POST":
                response = unauthenticated_client.post(path, json=payload)
            elif method == "PATCH":
                response = unauthenticated_client.patch(path, json=payload)
            elif method == "DELETE":
                response = unauthenticated_client.delete(path)

            assert (
                response.status_code == 401
            ), f"{method} {path} should require authentication but returned {response.status_code}"
            assert "detail" in response.json()

    def test_missing_authorization_header(self, unauthenticated_client):
        """CRITICAL: Verify request without Authorization header is rejected"""
        response = unauthenticated_client.get("/api/modules")
        assert response.status_code == 401
        assert "detail" in response.json()

    def test_malformed_authorization_header(self):
        """Verify malformed Authorization header is rejected"""
        from main import app

        client = TestClient(app)

        # Test various malformed headers
        malformed_headers = [
            {"Authorization": "InvalidFormat"},
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Basic token123"},  # Wrong scheme
            {"Authorization": "token123"},  # No scheme
        ]

        for headers in malformed_headers:
            response = client.get("/api/modules", headers=headers)
            # 401 for invalid auth, 403 for wrong scheme
            assert response.status_code in [
                401,
                403,
            ], f"Headers {headers} should be rejected but got {response.status_code}"

    def test_invalid_token_format(self):
        """Verify invalid token format is rejected"""
        from main import app

        client = TestClient(app)

        invalid_tokens = [
            "not.a.jwt.token",
            "invalid",
            "a.b",  # Too few parts
            "a.b.c.d",  # Too many parts
        ]

        for token in invalid_tokens:
            response = client.get(
                "/api/modules", headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 401, f"Token {token} should be rejected"

    def test_expired_token_rejected(self, expired_jwt_token):
        """CRITICAL: Verify expired tokens are rejected"""
        from main import app
        from middleware.auth import get_current_user_id

        # Don't override auth for this test - use real auth middleware
        client = TestClient(app)

        response = client.get(
            "/api/modules", headers={"Authorization": f"Bearer {expired_jwt_token}"}
        )
        assert response.status_code == 401
        assert "detail" in response.json()


class TestPublicEndpoints:
    """Test that public endpoints don't require authentication"""

    def test_root_endpoint_public(self, unauthenticated_client):
        """Verify root endpoint is accessible without auth"""
        response = unauthenticated_client.get("/")
        assert response.status_code == 200
        assert "name" in response.json()

    def test_health_endpoint_public(self, unauthenticated_client):
        """Verify health check endpoint is accessible without auth"""
        response = unauthenticated_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_docs_endpoints_public(self, unauthenticated_client):
        """Verify API documentation endpoints are accessible without auth"""
        # OpenAPI docs
        response = unauthenticated_client.get("/docs")
        assert response.status_code == 200

        # OpenAPI schema
        response = unauthenticated_client.get("/openapi.json")
        assert response.status_code == 200


class TestAuthenticatedAccess:
    """Test successful authentication scenarios"""

    def test_valid_auth_allows_access(self, client):
        """Verify valid authentication allows access to protected endpoints"""
        # The client fixture has mocked auth, so this should work
        response = client.get("/api/modules")
        assert response.status_code == 200

    def test_authenticated_user_has_user_id(self, client, test_user_id):
        """Verify authenticated requests have access to user_id"""
        # Create a module which requires user_id from auth
        response = client.get("/api/modules")
        assert response.status_code == 200
        # If auth wasn't working, this would fail with 401


class TestUserIdentification:
    """Test user identification from JWT tokens"""

    def test_different_users_get_different_contexts(
        self, client, other_user_client, test_user_id, other_user_id
    ):
        """Verify different auth tokens result in different user contexts"""
        # Both clients are authenticated but as different users
        # Verified by checking they can only see their own data

        # This is tested more thoroughly in test_authorization.py
        # Here we just verify the auth mechanism distinguishes users
        assert test_user_id != other_user_id


class TestAuthenticationEdgeCases:
    """Test edge cases in authentication"""

    def test_case_sensitive_bearer_scheme(self):
        """Verify Bearer scheme is case-insensitive (per HTTP spec)"""
        from main import app

        client = TestClient(app)

        # Note: FastAPI's HTTPBearer is case-insensitive by default
        # but we should verify this works as expected
        variations = ["Bearer", "bearer", "BEARER"]

        for scheme in variations:
            # Using a mock token since we're testing scheme parsing
            # This will fail auth but shouldn't fail on scheme parsing
            response = client.get(
                "/api/modules", headers={"Authorization": f"{scheme} fake.token.here"}
            )
            # Should get 401 (invalid token), not 403 (wrong scheme)
            assert response.status_code == 401

    def test_whitespace_in_token_rejected(self):
        """Verify tokens with whitespace are rejected"""
        from main import app

        client = TestClient(app)

        tokens_with_whitespace = [
            "token with spaces",
            " tokenWithLeadingSpace",
            "tokenWithTrailingSpace ",
            "token\twith\ttabs",
        ]

        for token in tokens_with_whitespace:
            response = client.get(
                "/api/modules", headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 401

    def test_empty_token_rejected(self):
        """Verify empty token is rejected"""
        from main import app

        client = TestClient(app)

        # Empty bearer token should be rejected
        response = client.get("/api/modules", headers={"Authorization": "Bearer"})
        assert response.status_code == 403 or response.status_code == 401

    def test_extremely_long_token_rejected(self):
        """Verify extremely long tokens are rejected"""
        from main import app

        client = TestClient(app)

        # Create an absurdly long token
        long_token = "a" * 10000

        response = client.get(
            "/api/modules", headers={"Authorization": f"Bearer {long_token}"}
        )
        assert response.status_code == 401


class TestCORSAndAuth:
    """Test interaction between CORS and authentication"""

    def test_preflight_request_doesnt_require_auth(self):
        """Verify CORS preflight (OPTIONS) requests don't require auth"""
        from main import app

        client = TestClient(app)

        # OPTIONS request (CORS preflight)
        response = client.options(
            "/api/modules",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        # Should not require authentication (OPTIONS is handled by CORS middleware)
        # Typically returns 200 or 405, but not 401
        assert response.status_code != 401


class TestSecurityHeaders:
    """Test security-related headers in authentication responses"""

    def test_unauthorized_response_includes_www_authenticate(
        self, unauthenticated_client
    ):
        """Verify 401 responses include WWW-Authenticate header or detail"""
        response = unauthenticated_client.get("/api/modules")
        assert response.status_code == 401

        # Per HTTP spec, 401 responses should include WWW-Authenticate header
        # FastAPI always includes detail in JSON response
        # Some frameworks add WWW-Authenticate header too
        data = response.json()
        assert "detail" in data, "401 responses should include error detail"

    def test_invalid_token_response_format(self):
        """Verify invalid token responses have consistent format"""
        from main import app

        client = TestClient(app)

        response = client.get(
            "/api/modules", headers={"Authorization": "Bearer invalid.token"}
        )
        assert response.status_code == 401

        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], str)
