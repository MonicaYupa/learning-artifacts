"""
Pytest configuration and shared fixtures
"""

import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from config.database import close_db_pool, execute_query, init_db_pool
from fastapi.testclient import TestClient
from jose import jwt


@pytest.fixture(scope="session", autouse=True)
def _disable_sentry():
    """
    Disable Sentry for all tests.
    This fixture runs once per test session and ensures Sentry is disabled
    by setting the TESTING environment variable.
    """
    # Store original value if it exists
    original_value = os.environ.get("TESTING")

    # Set TESTING=true to disable Sentry
    os.environ["TESTING"] = "true"

    yield

    # Restore original value after all tests
    if original_value is not None:
        os.environ["TESTING"] = original_value
    else:
        os.environ.pop("TESTING", None)


@pytest.fixture(scope="session", autouse=True)
def _init_database_pool():
    """
    Initialize database pool once for the entire test session.
    This fixture runs automatically before all tests (except those testing uninitialized state).
    """
    init_db_pool()
    yield
    close_db_pool()


@pytest.fixture(autouse=True)
def _cleanup_dependency_overrides():
    """
    Ensure app.dependency_overrides is cleared after every test.
    This is a safety net to prevent test pollution even if individual
    fixtures or tests fail to clean up properly.
    """
    yield
    # Clear after each test completes (success or failure)
    from main import app

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def db_pool():
    """
    Fixture for tests that need to manage pool state (init/close).

    This ensures pool is in a clean state before and after the test.
    Use this for tests that need to test pool initialization or cleanup behavior.
    """
    # Close pool if it exists, then re-initialize
    close_db_pool()
    init_db_pool()
    yield
    # Close again and re-init for the rest of the session
    close_db_pool()
    init_db_pool()


# ============================================================================
# Authentication Fixtures
# ============================================================================


@pytest.fixture
def test_user_id() -> str:
    """Fixture providing a consistent test user ID"""
    return "test-user-123"


@pytest.fixture
def other_user_id() -> str:
    """Fixture providing a different user ID for authorization tests"""
    return "other-user-456"


@pytest.fixture
def mock_jwt_secret() -> str:
    """Mock JWT secret for testing"""
    return "test-secret-key-for-testing-only"


@pytest.fixture
def mock_jwt_token(test_user_id: str, mock_jwt_secret: str) -> str:
    """Generate a valid mock JWT token for testing"""
    from datetime import timezone

    now = datetime.now(timezone.utc)
    payload = {
        "sub": test_user_id,
        "email": "test@example.com",
        "exp": now + timedelta(hours=1),
        "iat": now,
    }
    return jwt.encode(payload, mock_jwt_secret, algorithm="HS256")


@pytest.fixture
def expired_jwt_token(test_user_id: str, mock_jwt_secret: str) -> str:
    """Generate an expired JWT token for testing"""
    from datetime import timezone

    now = datetime.now(timezone.utc)
    payload = {
        "sub": test_user_id,
        "email": "test@example.com",
        "exp": now - timedelta(hours=1),  # Expired
        "iat": now - timedelta(hours=2),
    }
    return jwt.encode(payload, mock_jwt_secret, algorithm="HS256")


@pytest.fixture
def other_user_jwt_token(other_user_id: str, mock_jwt_secret: str) -> str:
    """Generate a JWT token for a different user (for authorization tests)"""
    from datetime import timezone

    now = datetime.now(timezone.utc)
    payload = {
        "sub": other_user_id,
        "email": "other@example.com",
        "exp": now + timedelta(hours=1),
        "iat": now,
    }
    return jwt.encode(payload, mock_jwt_secret, algorithm="HS256")


@pytest.fixture
def auth_headers(mock_jwt_token: str) -> Dict[str, str]:
    """Headers with valid authentication token"""
    return {"Authorization": f"Bearer {mock_jwt_token}"}


@pytest.fixture
def other_user_auth_headers(other_user_jwt_token: str) -> Dict[str, str]:
    """Headers with valid token for a different user"""
    return {"Authorization": f"Bearer {other_user_jwt_token}"}


# ============================================================================
# User Database Fixtures
# ============================================================================


@pytest.fixture
def test_user_in_db(test_user_id: str) -> Dict:
    """Ensure test user exists in database"""
    from config.database import get_or_create_user

    user = get_or_create_user("test@example.com")
    yield user
    # Don't delete - user might be used by other data


@pytest.fixture
def other_user_in_db(other_user_id: str) -> Dict:
    """Ensure other test user exists in database"""
    from config.database import get_or_create_user

    user = get_or_create_user("other@example.com")
    yield user
    # Don't delete - user might be used by other data


# ============================================================================
# Test Client Fixtures
# ============================================================================


@pytest.fixture
def client(test_user_id: str, test_user_in_db) -> TestClient:
    """TestClient with mocked authentication (bypasses JWT verification)"""
    from main import app
    from middleware.auth import get_current_user_id

    # Mock the authentication dependency
    async def mock_get_current_user_id() -> str:
        return test_user_in_db["id"]

    app.dependency_overrides[get_current_user_id] = mock_get_current_user_id

    test_client = TestClient(app)
    yield test_client

    # Clean up dependency override
    app.dependency_overrides.clear()


@pytest.fixture
def other_user_client(other_user_id: str, other_user_in_db) -> TestClient:
    """TestClient authenticated as a different user for authorization tests"""
    from main import app
    from middleware.auth import get_current_user_id

    async def mock_get_other_user_id() -> str:
        return other_user_in_db["id"]

    app.dependency_overrides[get_current_user_id] = mock_get_other_user_id

    test_client = TestClient(app)
    yield test_client

    # Clean up dependency override
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> TestClient:
    """TestClient without authentication for 401 tests"""
    from main import app

    return TestClient(app)


# ============================================================================
# Sample Data Fixtures
# ============================================================================


@pytest.fixture
def sample_exercise_data() -> List[Dict]:
    """Sample exercise data for testing"""
    return [
        {
            "sequence": 1,
            "name": "Python Basics",
            "type": "analysis",
            "prompt": "What is Python?",
            "material": None,
            "options": None,
            "scaffold": None,
            "estimated_minutes": 5,
        },
        {
            "sequence": 2,
            "name": "Understanding Variables",
            "type": "analysis",
            "prompt": "What is a variable?",
            "material": None,
            "options": None,
            "scaffold": None,
            "estimated_minutes": 5,
        },
        {
            "sequence": 3,
            "name": "Function Concepts",
            "type": "analysis",
            "prompt": "What is a function?",
            "material": None,
            "options": None,
            "scaffold": None,
            "estimated_minutes": 5,
        },
    ]


@pytest.fixture
def sample_module_data(sample_exercise_data: List[Dict]) -> Dict:
    """Sample module data for testing"""
    return {
        "title": "Introduction to Python",
        "domain": "Programming",
        "skill_level": "beginner",
        "exercises": sample_exercise_data,
    }


@pytest.fixture
def mock_claude_generate_module(sample_module_data: Dict):
    """Mock Claude API module generation"""
    with patch("services.claude_service.generate_module") as mock:
        mock.return_value = AsyncMock(return_value=sample_module_data)
        yield mock


@pytest.fixture
def mock_claude_evaluate_answer():
    """Mock Claude API answer evaluation"""
    with patch("services.claude_service.evaluate_answer") as mock:
        mock.return_value = AsyncMock(
            return_value={
                "assessment": "strong",
                "internal_score": 85,
                "feedback": "Great answer! You demonstrated good understanding.",
            }
        )
        yield mock


@pytest.fixture
def mock_claude_extract_topic():
    """Mock Claude API topic extraction"""
    with patch("services.claude_service.extract_topic_and_level") as mock:
        mock.return_value = AsyncMock(
            return_value={"topic": "Python Basics", "skill_level": "beginner"}
        )
        yield mock


# ============================================================================
# Sentry SDK Mocking Fixtures
# ============================================================================


@pytest.fixture
def mock_sentry_sdk():
    """
    Mock the entire Sentry SDK for isolated testing.
    This fixture provides properly isolated mocks for all Sentry SDK functions.

    Usage:
        def test_something(mock_sentry_sdk):
            # Your test code here
            # Access mocks via mock_sentry_sdk.set_user, mock_sentry_sdk.set_context, etc.
    """
    with (
        patch("sentry_sdk.set_user") as mock_set_user,
        patch("sentry_sdk.set_context") as mock_set_context,
        patch("sentry_sdk.capture_exception") as mock_capture,
        patch("sentry_sdk.capture_message") as mock_message,
    ):

        # Create a container object to hold all mocks
        class SentryMocks:
            def __init__(self):
                self.set_user = mock_set_user
                self.set_context = mock_set_context
                self.capture_exception = mock_capture
                self.capture_message = mock_message

        yield SentryMocks()


# ============================================================================
# Database Test Data Fixtures
# ============================================================================


@pytest.fixture
def created_module(client, test_user_in_db: Dict, sample_module_data: Dict) -> Dict:
    """Create a test module in the database"""
    query = """
        INSERT INTO modules (user_id, title, domain, skill_level, exercises)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, title, domain, skill_level, exercises, created_at
    """

    module = execute_query(
        query,
        (
            test_user_in_db["id"],
            sample_module_data["title"],
            sample_module_data["domain"],
            sample_module_data["skill_level"],
            json.dumps(sample_module_data["exercises"]),
        ),
        fetch_one=True,
    )

    yield module

    # Cleanup
    execute_query("DELETE FROM modules WHERE id = %s", (module["id"],))


@pytest.fixture
def other_user_module(other_user_in_db: Dict, sample_module_data: Dict) -> Dict:
    """Create a module owned by a different user for authorization tests"""
    query = """
        INSERT INTO modules (user_id, title, domain, skill_level, exercises)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, title, domain, skill_level, exercises, created_at, user_id
    """

    module = execute_query(
        query,
        (
            other_user_in_db["id"],
            "Other User's Module",
            sample_module_data["domain"],
            sample_module_data["skill_level"],
            json.dumps(sample_module_data["exercises"]),
        ),
        fetch_one=True,
    )

    yield module

    # Cleanup
    execute_query("DELETE FROM modules WHERE id = %s", (module["id"],))


@pytest.fixture
def created_session(client, test_user_in_db: Dict, created_module: Dict) -> Dict:
    """Create a test session in the database"""
    query = """
        INSERT INTO sessions (user_id, module_id, current_exercise_index, attempts, status)
        VALUES (%s, %s, 0, '[]'::jsonb, 'in_progress')
        RETURNING id, user_id, module_id, current_exercise_index, attempts,
                  status, confidence_rating, started_at, completed_at
    """

    session = execute_query(
        query,
        (test_user_in_db["id"], created_module["id"]),
        fetch_one=True,
    )

    yield session

    # Cleanup
    execute_query("DELETE FROM sessions WHERE id = %s", (session["id"],))


@pytest.fixture
def other_user_session(other_user_in_db: Dict, other_user_module: Dict) -> Dict:
    """Create a session owned by a different user for authorization tests"""
    query = """
        INSERT INTO sessions (user_id, module_id, current_exercise_index, attempts, status)
        VALUES (%s, %s, 0, '[]'::jsonb, 'in_progress')
        RETURNING id, user_id, module_id, current_exercise_index, attempts,
                  status, confidence_rating, started_at, completed_at
    """

    session = execute_query(
        query,
        (other_user_in_db["id"], other_user_module["id"]),
        fetch_one=True,
    )

    yield session

    # Cleanup
    execute_query("DELETE FROM sessions WHERE id = %s", (session["id"],))


@pytest.fixture
def completed_session(client, test_user_in_db: Dict, created_module: Dict) -> Dict:
    """Create a completed session for testing immutability"""
    query = """
        INSERT INTO sessions (user_id, module_id, current_exercise_index, attempts, status, completed_at)
        VALUES (%s, %s, 0, '[]'::jsonb, 'completed', NOW())
        RETURNING id, user_id, module_id, current_exercise_index, attempts,
                  status, confidence_rating, started_at, completed_at
    """

    session = execute_query(
        query,
        (test_user_in_db["id"], created_module["id"]),
        fetch_one=True,
    )

    yield session

    # Cleanup
    execute_query("DELETE FROM sessions WHERE id = %s", (session["id"],))
