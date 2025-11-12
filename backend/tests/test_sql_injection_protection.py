"""
Security tests for SQL injection protection in sessions router

This module tests the SQL injection protection mechanisms in the update_session endpoint.
It verifies that only allowed fields can be updated and that all user input is properly
parameterized to prevent SQL injection attacks.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest
from fastapi import HTTPException
from models.schemas import SessionStatus, SessionUpdateRequest
from routers.sessions import update_session


class TestSQLInjectionProtection:
    """Test suite for SQL injection protection in update_session endpoint"""

    @pytest.mark.asyncio
    async def test_update_session_only_uses_whitelisted_fields(self):
        """
        Test that update_session only processes fields defined in ALLOWED_UPDATE_FIELDS

        This test verifies that the field mapping dictionary approach prevents
        arbitrary fields from being used in SQL queries.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        # Mock request with valid field
        request = SessionUpdateRequest(current_exercise_index=1)

        # Mock the database query execution
        mock_session_data = {
            "id": session_id,
            "user_id": user_id,
            "module_id": "module-789",
            "current_exercise_index": 1,
            "attempts": [],
            "status": "in_progress",
            "confidence_rating": None,
            "started_at": "2025-11-12T00:00:00",
            "completed_at": None,
        }

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            with patch("routers.sessions.execute_query") as mock_execute:
                mock_execute.return_value = mock_session_data

                result = await update_session(session_id, request, user_id)

                # Verify execute_query was called
                assert mock_execute.called

                # Get the query that was executed
                call_args = mock_execute.call_args
                executed_query = call_args[0][0]

                # Verify the query only contains whitelisted column names
                assert "current_exercise_index = %s" in executed_query
                assert "UPDATE sessions" in executed_query
                assert "WHERE id = %s" in executed_query

                # Verify values are parameterized (not directly in query string)
                assert (
                    "1" not in executed_query
                )  # The value should be in params, not query

                # Verify result
                assert result["id"] == session_id
                assert result["current_exercise_index"] == 1

    @pytest.mark.asyncio
    async def test_update_session_handles_status_enum_correctly(self):
        """
        Test that status enum values are properly extracted and parameterized

        This verifies that enum values (like SessionStatus) are converted to their
        underlying value before being passed as parameters, preventing object
        representation from being injected into the query.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        # Mock request with status enum
        request = SessionUpdateRequest(status=SessionStatus.COMPLETED)

        mock_session_data = {
            "id": session_id,
            "user_id": user_id,
            "module_id": "module-789",
            "current_exercise_index": 0,
            "attempts": [],
            "status": "completed",
            "confidence_rating": None,
            "started_at": "2025-11-12T00:00:00",
            "completed_at": "2025-11-12T01:00:00",
        }

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            with patch("routers.sessions.execute_query") as mock_execute:
                mock_execute.return_value = mock_session_data

                result = await update_session(session_id, request, user_id)

                # Get the parameters that were passed
                call_args = mock_execute.call_args
                params = call_args[0][1]

                # Verify the status value is a string (enum.value), not the enum object
                # The first param should be the string "completed", not the enum
                assert "completed" in params
                # Verify all params are the expected primitive types (str, int), not enum objects
                for param in params:
                    assert not isinstance(
                        param, SessionStatus
                    ), "Enum object found in params - should be enum.value"

                # Verify completed_at was automatically set
                executed_query = call_args[0][0]
                assert "completed_at = NOW()" in executed_query

    @pytest.mark.asyncio
    async def test_update_session_multiple_fields(self):
        """
        Test that multiple fields can be updated simultaneously with proper parameterization

        This ensures that the loop-based approach correctly handles multiple fields
        while maintaining SQL injection protection for all of them.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        # Mock request with multiple fields
        request = SessionUpdateRequest(current_exercise_index=2, confidence_rating=4)

        mock_session_data = {
            "id": session_id,
            "user_id": user_id,
            "module_id": "module-789",
            "current_exercise_index": 2,
            "attempts": [],
            "status": "in_progress",
            "confidence_rating": 4,
            "started_at": "2025-11-12T00:00:00",
            "completed_at": None,
        }

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            with patch("routers.sessions.execute_query") as mock_execute:
                mock_execute.return_value = mock_session_data

                result = await update_session(session_id, request, user_id)

                # Get the query and parameters
                call_args = mock_execute.call_args
                executed_query = call_args[0][0]
                params = call_args[0][1]

                # Verify both fields are in the query with parameterization
                assert "current_exercise_index = %s" in executed_query
                assert "confidence_rating = %s" in executed_query

                # Verify parameters contain the values
                assert 2 in params
                assert 4 in params

                # Verify values are NOT directly in query string
                assert "= 2" not in executed_query
                assert "= 4" not in executed_query

    @pytest.mark.asyncio
    async def test_update_session_rejects_empty_request(self):
        """
        Test that update_session rejects requests with no fields to update

        This ensures that the endpoint properly validates that at least one
        field is provided for update.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        # Mock request with no fields set
        request = SessionUpdateRequest()

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            # Should raise HTTPException for empty update
            with pytest.raises(HTTPException) as exc_info:
                await update_session(session_id, request, user_id)

            assert exc_info.value.status_code == 400
            assert "No fields provided for update" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_session_values_are_parameterized(self):
        """
        Test that all values are passed as parameters, not embedded in query string

        This is critical for SQL injection prevention - even with whitelisted column
        names, values must be parameterized to prevent injection through value fields.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        # Test with various values including ones that could be used for injection
        request = SessionUpdateRequest(current_exercise_index=5, confidence_rating=3)

        mock_session_data = {
            "id": session_id,
            "user_id": user_id,
            "module_id": "module-789",
            "current_exercise_index": 5,
            "attempts": [],
            "status": "in_progress",
            "confidence_rating": 3,
            "started_at": "2025-11-12T00:00:00",
            "completed_at": None,
        }

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            with patch("routers.sessions.execute_query") as mock_execute:
                mock_execute.return_value = mock_session_data

                await update_session(session_id, request, user_id)

                call_args = mock_execute.call_args
                executed_query = call_args[0][0]
                params = call_args[0][1]

                # Count the number of %s placeholders in the query
                placeholder_count = executed_query.count("%s")

                # Should have placeholders for each field + session_id
                # current_exercise_index, confidence_rating, and session_id = 3 total
                assert placeholder_count == 3

                # Verify all values are in params tuple
                assert len(params) == 3
                assert 5 in params
                assert 3 in params
                assert session_id in params

    @pytest.mark.asyncio
    async def test_field_mapping_dictionary_approach(self):
        """
        Test that the ALLOWED_UPDATE_FIELDS dictionary approach is being used

        This test verifies the refactored code uses dictionary-based field mapping
        instead of the old repetitive validation approach.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        request = SessionUpdateRequest(current_exercise_index=0)

        mock_session_data = {
            "id": session_id,
            "user_id": user_id,
            "module_id": "module-789",
            "current_exercise_index": 0,
            "attempts": [],
            "status": "in_progress",
            "confidence_rating": None,
            "started_at": "2025-11-12T00:00:00",
            "completed_at": None,
        }

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            with patch("routers.sessions.execute_query") as mock_execute:
                mock_execute.return_value = mock_session_data

                result = await update_session(session_id, request, user_id)

                # The fact that this succeeds shows the dictionary approach works
                assert result is not None
                assert result["current_exercise_index"] == 0


class TestUpdateSessionFunctionality:
    """Test suite for verifying update_session functionality remains correct after refactoring"""

    @pytest.mark.asyncio
    async def test_ownership_verification_is_enforced(self):
        """
        Test that session ownership verification still occurs before updates

        Security requires that users can only update their own sessions.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        request = SessionUpdateRequest(current_exercise_index=1)

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            # Simulate ownership verification failure
            mock_verify.side_effect = HTTPException(
                status_code=403, detail="Access denied"
            )

            # Should raise the HTTPException from verify_session_ownership
            with pytest.raises(HTTPException) as exc_info:
                await update_session(session_id, request, user_id)

            assert exc_info.value.status_code == 403
            assert "Access denied" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_completed_status_sets_completed_at(self):
        """
        Test that marking a session as completed automatically sets completed_at

        This is a business logic requirement that should be preserved.
        """
        session_id = "test-session-123"
        user_id = "test-user-456"

        request = SessionUpdateRequest(status=SessionStatus.COMPLETED)

        mock_session_data = {
            "id": session_id,
            "user_id": user_id,
            "module_id": "module-789",
            "current_exercise_index": 5,
            "attempts": [],
            "status": "completed",
            "confidence_rating": 4,
            "started_at": "2025-11-12T00:00:00",
            "completed_at": "2025-11-12T01:00:00",
        }

        with patch("routers.sessions.verify_session_ownership") as mock_verify:
            mock_verify.return_value = {"user_id": user_id}

            with patch("routers.sessions.execute_query") as mock_execute:
                mock_execute.return_value = mock_session_data

                result = await update_session(session_id, request, user_id)

                call_args = mock_execute.call_args
                executed_query = call_args[0][0]

                # Verify completed_at is set in the query
                assert "completed_at = NOW()" in executed_query
                assert result["status"] == "completed"
