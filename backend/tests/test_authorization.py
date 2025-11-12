"""
Authorization and Access Control Tests
Tests for user isolation and ownership verification
"""

from config.database import execute_query


class TestModuleAuthorization:
    """Test authorization for module endpoints"""

    def test_user_cannot_access_other_users_module(self, client, other_user_module):
        """CRITICAL: Verify users cannot access modules they don't own"""
        response = client.get(f"/api/modules/{other_user_module['id']}")
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
        assert "permission" in response.json()["detail"].lower()

    def test_list_modules_only_returns_own_modules(
        self, client, test_user_in_db, created_module, other_user_module
    ):
        """CRITICAL: Verify list endpoint only returns user's own modules"""
        response = client.get("/api/modules")
        assert response.status_code == 200

        modules = response.json()

        # Should have at least the test user's module
        assert len(modules) >= 1

        # Should NOT include other user's module
        other_module_ids = [m["id"] for m in modules]
        assert other_user_module["id"] not in other_module_ids

        # Verify only contains the test user's module
        assert any(m["id"] == created_module["id"] for m in modules)

    def test_module_not_found_returns_404(self, client):
        """Verify invalid module ID returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/modules/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_other_user_cannot_access_module_via_client(
        self, created_module, other_user_client
    ):
        """Verify a different authenticated user cannot access module"""
        response = other_user_client.get(f"/api/modules/{created_module['id']}")
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


class TestSessionAuthorization:
    """Test authorization for session endpoints"""

    def test_user_cannot_access_other_users_session(self, client, other_user_session):
        """CRITICAL: Verify users cannot access sessions they don't own"""
        response = client.get(f"/api/sessions/{other_user_session['id']}")
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
        assert "permission" in response.json()["detail"].lower()

    def test_user_cannot_update_other_users_session(self, client, other_user_session):
        """CRITICAL: Verify users cannot update sessions they don't own"""
        response = client.patch(
            f"/api/sessions/{other_user_session['id']}",
            json={"current_exercise_index": 1},
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_user_cannot_submit_answer_to_other_users_session(
        self, client, other_user_session
    ):
        """CRITICAL: Prevent unauthorized session manipulation"""
        response = client.post(
            f"/api/sessions/{other_user_session['id']}/submit",
            json={
                "answer_text": "Unauthorized attempt",
                "time_spent_seconds": 10,
                "hints_used": 0,
            },
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_user_cannot_request_hint_for_other_users_session(
        self, client, other_user_session
    ):
        """CRITICAL: Verify users cannot request hints for sessions they don't own"""
        response = client.post(
            f"/api/sessions/{other_user_session['id']}/hint", json={}
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_user_cannot_create_session_for_other_users_module(
        self, client, other_user_module
    ):
        """CRITICAL: Verify users cannot create sessions for modules they don't own"""
        response = client.post(
            "/api/sessions", json={"module_id": other_user_module["id"]}
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_session_not_found_returns_404(self, client):
        """Verify invalid session ID returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/sessions/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_other_user_cannot_access_session_via_client(
        self, created_session, other_user_client
    ):
        """Verify a different authenticated user cannot access session"""
        response = other_user_client.get(f"/api/sessions/{created_session['id']}")
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


class TestDataIsolation:
    """Test database-level user isolation"""

    def test_modules_query_filters_by_user_id(
        self,
        client,
        test_user_in_db,
        other_user_in_db,
        created_module,
        other_user_module,
    ):
        """CRITICAL: Verify database queries properly filter by user_id"""
        # Directly query database to verify isolation
        query = "SELECT id, user_id FROM modules WHERE user_id = %s"
        user_modules = execute_query(query, (test_user_in_db["id"],))

        # Should only contain test user's modules
        for module in user_modules:
            assert module["user_id"] == test_user_in_db["id"]

        # Verify other user's module is NOT in results
        user_module_ids = [m["id"] for m in user_modules]
        assert other_user_module["id"] not in user_module_ids

    def test_sessions_query_filters_by_user_id(
        self,
        client,
        test_user_in_db,
        other_user_in_db,
        created_session,
        other_user_session,
    ):
        """CRITICAL: Verify session queries properly filter by user_id"""
        # Directly query database to verify isolation
        query = "SELECT id, user_id FROM sessions WHERE user_id = %s"
        user_sessions = execute_query(query, (test_user_in_db["id"],))

        # Should only contain test user's sessions
        for session in user_sessions:
            assert session["user_id"] == test_user_in_db["id"]

        # Verify other user's session is NOT in results
        user_session_ids = [s["id"] for s in user_sessions]
        assert other_user_session["id"] not in user_session_ids

    def test_module_ownership_verification_in_get_endpoint(
        self, client, test_user_in_db, other_user_module
    ):
        """CRITICAL: Verify ownership check prevents access even if module exists"""
        # Module exists in database
        query = "SELECT id FROM modules WHERE id = %s"
        result = execute_query(query, (other_user_module["id"],), fetch_one=True)
        assert result is not None

        # But test user should NOT be able to access it
        response = client.get(f"/api/modules/{other_user_module['id']}")
        assert response.status_code == 403

    def test_session_ownership_verification_in_submit_endpoint(
        self, client, test_user_in_db, other_user_session
    ):
        """CRITICAL: Verify ownership check in submit endpoint"""
        # Session exists in database
        query = "SELECT id FROM sessions WHERE id = %s"
        result = execute_query(query, (other_user_session["id"],), fetch_one=True)
        assert result is not None

        # But test user should NOT be able to submit answers to it
        response = client.post(
            f"/api/sessions/{other_user_session['id']}/submit",
            json={
                "answer_text": "Test answer",
                "time_spent_seconds": 60,
                "hints_used": 0,
            },
        )
        assert response.status_code == 403


class TestMultiUserScenarios:
    """Test scenarios involving multiple users"""

    def test_multiple_users_can_have_same_module_topic(
        self, sample_module_data, test_user_in_db, other_user_in_db
    ):
        """Verify multiple users can create modules with same topic (data isolation)"""
        import json

        from fastapi.testclient import TestClient
        from main import app
        from middleware.auth import get_current_user_id

        # Create module for test user
        query = """
            INSERT INTO modules (user_id, title, domain, skill_level, exercises)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id
        """

        test_user_module = execute_query(
            query,
            (
                test_user_in_db["id"],
                "Shared Topic Module",
                sample_module_data["domain"],
                sample_module_data["skill_level"],
                json.dumps(sample_module_data["exercises"]),
            ),
            fetch_one=True,
        )

        # Create module for other user with same title
        other_user_module = execute_query(
            query,
            (
                other_user_in_db["id"],
                "Shared Topic Module",  # Same title
                sample_module_data["domain"],
                sample_module_data["skill_level"],
                json.dumps(sample_module_data["exercises"]),
            ),
            fetch_one=True,
        )

        try:
            # Test as first user
            async def mock_test_user_id() -> str:
                return test_user_in_db["id"]

            app.dependency_overrides[get_current_user_id] = mock_test_user_id
            test_client = TestClient(app)

            response = test_client.get("/api/modules")
            modules = response.json()
            test_user_module_ids = [m["id"] for m in modules]

            assert test_user_module["id"] in test_user_module_ids
            assert other_user_module["id"] not in test_user_module_ids

            # Test as other user
            async def mock_other_user_id() -> str:
                return other_user_in_db["id"]

            app.dependency_overrides[get_current_user_id] = mock_other_user_id
            other_client = TestClient(app)

            response = other_client.get("/api/modules")
            modules = response.json()
            other_user_module_ids = [m["id"] for m in modules]

            assert other_user_module["id"] in other_user_module_ids
            assert test_user_module["id"] not in other_user_module_ids

        finally:
            # Cleanup
            app.dependency_overrides.clear()
            execute_query(
                "DELETE FROM modules WHERE id = %s", (test_user_module["id"],)
            )
            execute_query(
                "DELETE FROM modules WHERE id = %s", (other_user_module["id"],)
            )

    def test_concurrent_sessions_different_users_same_module_structure(
        self, sample_module_data, test_user_in_db, other_user_in_db
    ):
        """Verify session isolation when users work on similar modules"""
        import json

        from fastapi.testclient import TestClient
        from main import app
        from middleware.auth import get_current_user_id

        # Create similar modules for both users
        query = """
            INSERT INTO modules (user_id, title, domain, skill_level, exercises)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """

        test_user_module = execute_query(
            query,
            (
                test_user_in_db["id"],
                "Test Module",
                sample_module_data["domain"],
                sample_module_data["skill_level"],
                json.dumps(sample_module_data["exercises"]),
            ),
            fetch_one=True,
        )

        other_user_module = execute_query(
            query,
            (
                other_user_in_db["id"],
                "Test Module",
                sample_module_data["domain"],
                sample_module_data["skill_level"],
                json.dumps(sample_module_data["exercises"]),
            ),
            fetch_one=True,
        )

        try:
            # Setup test user client and create session
            async def mock_test_user_id() -> str:
                return test_user_in_db["id"]

            app.dependency_overrides[get_current_user_id] = mock_test_user_id
            test_client = TestClient(app)

            test_session_response = test_client.post(
                "/api/sessions", json={"module_id": test_user_module["id"]}
            )
            assert (
                test_session_response.status_code == 201
            ), f"Failed to create test session: {test_session_response.json()}"
            test_session = test_session_response.json()

            # Setup other user client and create session
            async def mock_other_user_id() -> str:
                return other_user_in_db["id"]

            app.dependency_overrides[get_current_user_id] = mock_other_user_id
            other_client = TestClient(app)

            other_session_response = other_client.post(
                "/api/sessions", json={"module_id": other_user_module["id"]}
            )
            assert (
                other_session_response.status_code == 201
            ), f"Failed to create other session: {other_session_response.json()}"
            other_session = other_session_response.json()

            # Test as first user - can access own session but not other's
            app.dependency_overrides[get_current_user_id] = mock_test_user_id
            test_client = TestClient(app)

            response = test_client.get(f"/api/sessions/{test_session['id']}")
            assert response.status_code == 200

            response = test_client.get(f"/api/sessions/{other_session['id']}")
            assert response.status_code == 403

            # Test as other user - can access own session but not test user's
            app.dependency_overrides[get_current_user_id] = mock_other_user_id
            other_client = TestClient(app)

            response = other_client.get(f"/api/sessions/{other_session['id']}")
            assert response.status_code == 200

            response = other_client.get(f"/api/sessions/{test_session['id']}")
            assert response.status_code == 403

        finally:
            # Cleanup
            app.dependency_overrides.clear()
            execute_query(
                "DELETE FROM sessions WHERE module_id IN (%s, %s)",
                (test_user_module["id"], other_user_module["id"]),
            )
            execute_query(
                "DELETE FROM modules WHERE id IN (%s, %s)",
                (test_user_module["id"], other_user_module["id"]),
            )
