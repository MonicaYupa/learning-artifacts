"""
Critical Data Flow Tests
Tests for core application functionality and critical user journeys
"""

from unittest.mock import patch

from config.constants import ExerciseConstants
from config.database import execute_query


def create_complete_exercise(
    sequence=1,
    name="Test Exercise",
    question="Q",
):
    """Helper function to create a complete exercise with all required fields"""
    return {
        "sequence": sequence,
        "name": name,
        "type": "analysis",
        "prompt": question,
        "material": None,
        "options": None,
        "scaffold": None,
        "estimated_minutes": 5,
    }


class TestModuleGenerationFlow:
    """Test the complete module generation and retrieval flow"""

    def test_generate_module_with_topic_and_skill_level(
        self, client, mock_claude_generate_module
    ):
        """CRITICAL: Verify module generation pipeline works with direct parameters"""
        # Mock the Claude service
        with patch("routers.modules.generate_module") as mock_generate:
            mock_generate.return_value = {
                "title": "Python Basics",
                "domain": "Programming",
                "skill_level": "beginner",
                "exercises": [
                    create_complete_exercise(
                        sequence=1,
                        name="Python Basics",
                        question="What is Python?",
                    )
                ],
            }

            response = client.post(
                "/api/modules/generate",
                json={
                    "topic": "Python",
                    "skill_level": "beginner",
                    "exercise_count": 1,
                },
            )

            assert response.status_code == 201
            module = response.json()

            # Verify response structure
            assert "id" in module
            assert module["title"] == "Python Basics"
            assert module["domain"] == "Programming"
            assert module["skill_level"] == "beginner"
            assert len(module["exercises"]) == 1
            assert "created_at" in module

            # Verify it was stored in database
            db_module = execute_query(
                "SELECT * FROM modules WHERE id = %s", (module["id"],), fetch_one=True
            )
            assert db_module is not None
            assert db_module["title"] == "Python Basics"

            # Cleanup
            execute_query("DELETE FROM modules WHERE id = %s", (module["id"],))

    def test_generate_module_with_message(self, client):
        """CRITICAL: Verify module generation with natural language message"""
        with patch("routers.modules.extract_topic_and_level") as mock_extract:
            mock_extract.return_value = {
                "topic": "Python Basics",
                "skill_level": "beginner",
            }

            with patch("routers.modules.generate_module") as mock_generate:
                mock_generate.return_value = {
                    "title": "Python Basics",
                    "domain": "Programming",
                    "skill_level": "beginner",
                    "exercises": [
                        create_complete_exercise(
                            sequence=1,
                            name="Python Basics",
                            question="What is Python?",
                        )
                    ],
                }

                response = client.post(
                    "/api/modules/generate",
                    json={
                        "message": "I want to learn Python as a beginner",
                        "exercise_count": 1,
                    },
                )

                assert response.status_code == 201
                module = response.json()
                assert "id" in module
                assert module["skill_level"] == "beginner"

                # Verify extraction was called
                mock_extract.assert_called_once()

                # Cleanup
                execute_query("DELETE FROM modules WHERE id = %s", (module["id"],))

    def test_module_retrieval_after_generation(self, client):
        """CRITICAL: Verify generated modules can be retrieved"""
        with patch("routers.modules.generate_module") as mock_generate:
            mock_generate.return_value = {
                "title": "Test Module",
                "domain": "Testing",
                "skill_level": "intermediate",
                "exercises": [
                    create_complete_exercise(
                        sequence=1,
                        name="Test Question",
                        question="Test question",
                    )
                ],
            }

            # Generate module
            gen_response = client.post(
                "/api/modules/generate",
                json={"topic": "Testing", "skill_level": "intermediate"},
            )
            assert gen_response.status_code == 201
            module_id = gen_response.json()["id"]

            try:
                # Retrieve module
                get_response = client.get(f"/api/modules/{module_id}")
                assert get_response.status_code == 200

                retrieved = get_response.json()
                assert retrieved["id"] == module_id
                assert retrieved["title"] == "Test Module"
                assert len(retrieved["exercises"]) == 1

            finally:
                # Cleanup
                execute_query("DELETE FROM modules WHERE id = %s", (module_id,))

    def test_list_modules_includes_generated_module(self, client):
        """CRITICAL: Verify generated modules appear in list endpoint"""
        with patch("routers.modules.generate_module") as mock_generate:
            mock_generate.return_value = {
                "title": "Listed Module",
                "domain": "Testing",
                "skill_level": "beginner",
                "exercises": [
                    create_complete_exercise(
                        sequence=1, name="Test Exercise", question="Q"
                    )
                ],
            }

            # Generate module
            gen_response = client.post(
                "/api/modules/generate",
                json={"topic": "Testing", "skill_level": "beginner"},
            )
            module_id = gen_response.json()["id"]

            try:
                # List modules
                list_response = client.get("/api/modules")
                assert list_response.status_code == 200

                modules = list_response.json()
                module_ids = [m["id"] for m in modules]
                assert module_id in module_ids

                # Find our module
                our_module = next(m for m in modules if m["id"] == module_id)
                assert our_module["title"] == "Listed Module"
                assert "exercise_count" in our_module
                assert "estimated_minutes" in our_module

            finally:
                # Cleanup
                execute_query("DELETE FROM modules WHERE id = %s", (module_id,))


class TestSessionCreationAndManagement:
    """Test session creation and state management"""

    def test_create_session_for_module(self, client, created_module):
        """CRITICAL: Verify session creation pipeline works"""
        response = client.post(
            "/api/sessions", json={"module_id": created_module["id"]}
        )

        assert response.status_code == 201
        session = response.json()

        # Verify response structure
        assert "id" in session
        assert session["module_id"] == created_module["id"]
        assert session["current_exercise_index"] == 0
        assert session["attempts"] == []
        assert session["status"] == "in_progress"
        assert session["confidence_rating"] is None
        assert "started_at" in session

        # Cleanup
        execute_query("DELETE FROM sessions WHERE id = %s", (session["id"],))

    def test_session_retrieval_after_creation(self, client, created_module):
        """CRITICAL: Verify created sessions can be retrieved"""
        # Create session
        create_response = client.post(
            "/api/sessions", json={"module_id": created_module["id"]}
        )
        session_id = create_response.json()["id"]

        try:
            # Retrieve session
            get_response = client.get(f"/api/sessions/{session_id}")
            assert get_response.status_code == 200

            retrieved = get_response.json()
            assert retrieved["id"] == session_id
            assert retrieved["module_id"] == created_module["id"]
            assert retrieved["status"] == "in_progress"

        finally:
            # Cleanup
            execute_query("DELETE FROM sessions WHERE id = %s", (session_id,))

    def test_update_session_state(self, client, created_session):
        """CRITICAL: Verify session state updates work"""
        # Update current exercise index
        response = client.patch(
            f"/api/sessions/{created_session['id']}",
            json={"current_exercise_index": 1},
        )

        assert response.status_code == 200
        updated = response.json()
        assert updated["current_exercise_index"] == 1

    def test_mark_session_as_completed(self, client, created_session):
        """CRITICAL: Verify session completion flow"""
        # Mark as completed
        response = client.patch(
            f"/api/sessions/{created_session['id']}", json={"status": "completed"}
        )

        assert response.status_code == 200
        updated = response.json()
        assert updated["status"] == "completed"
        assert updated["completed_at"] is not None


class TestAnswerSubmissionFlow:
    """Test the complete answer submission and evaluation flow"""

    def test_submit_answer_creates_attempt_record(self, client, created_session):
        """CRITICAL: Verify answer submission creates attempt in database"""
        with patch("routers.sessions.evaluate_answer") as mock_evaluate:
            mock_evaluate.return_value = {
                "assessment": "strong",
                "internal_score": 85,
                "feedback": "Great job!",
            }

            response = client.post(
                f"/api/sessions/{created_session['id']}/submit",
                json={
                    "answer_text": "Python is a programming language",
                    "time_spent_seconds": 120,
                    "hints_used": 0,
                    "exercise_index": 0,
                },
            )

            assert response.status_code == 200
            result = response.json()

            # Verify response structure
            assert result["assessment"] == "strong"
            assert result["internal_score"] == 85
            assert result["feedback"] == "Great job!"
            assert result["attempt_number"] == 1
            assert result["hint_available"] is True

            # Verify attempt was stored
            session = execute_query(
                "SELECT * FROM sessions WHERE id = %s",
                (created_session["id"],),
                fetch_one=True,
            )
            attempts = session["attempts"]
            assert len(attempts) == 1
            assert attempts[0]["answer_text"] == "Python is a programming language"
            assert attempts[0]["assessment"] == "strong"

    def test_multiple_answer_submissions_increment_attempts(
        self, client, created_session
    ):
        """CRITICAL: Verify multiple submissions increment attempt numbers"""
        with patch("routers.sessions.evaluate_answer") as mock_evaluate:
            mock_evaluate.return_value = {
                "assessment": "developing",
                "internal_score": 50,
                "feedback": "Try again",
            }

            # Submit first attempt
            response1 = client.post(
                f"/api/sessions/{created_session['id']}/submit",
                json={
                    "answer_text": "First attempt",
                    "time_spent_seconds": 60,
                    "hints_used": 0,
                    "exercise_index": 0,
                },
            )
            assert response1.json()["attempt_number"] == 1

            # Submit second attempt
            response2 = client.post(
                f"/api/sessions/{created_session['id']}/submit",
                json={
                    "answer_text": "Second attempt",
                    "time_spent_seconds": 60,
                    "hints_used": 1,
                    "exercise_index": 0,
                },
            )
            assert response2.json()["attempt_number"] == 2

            # Submit third attempt
            response3 = client.post(
                f"/api/sessions/{created_session['id']}/submit",
                json={
                    "answer_text": "Third attempt",
                    "time_spent_seconds": 60,
                    "hints_used": 2,
                    "exercise_index": 0,
                },
            )
            assert response3.json()["attempt_number"] == 3

            # Verify all attempts are stored
            session = execute_query(
                "SELECT * FROM sessions WHERE id = %s",
                (created_session["id"],),
                fetch_one=True,
            )
            assert len(session["attempts"]) == 3


class TestHintRequestFlow:
    """Test hint request functionality"""

    def test_request_hint_returns_hint_text(self, client, created_session):
        """CRITICAL: Verify hint request returns correct hint"""
        response = client.post(
            f"/api/sessions/{created_session['id']}/hint", json={"hint_level": 1}
        )

        assert response.status_code == 200
        result = response.json()

        assert result["hint_level"] == 1
        assert "hint_text" in result
        assert result["hints_remaining"] == ExerciseConstants.MAX_HINTS - 1

    def test_progressive_hint_levels(self, client, created_session):
        """CRITICAL: Verify hints progress through levels"""
        # Request hints in sequence
        for level in range(1, ExerciseConstants.MAX_HINTS + 1):
            response = client.post(
                f"/api/sessions/{created_session['id']}/hint",
                json={"hint_level": level},
            )

            assert response.status_code == 200
            result = response.json()
            assert result["hint_level"] == level
            assert result["hints_remaining"] == ExerciseConstants.MAX_HINTS - level

    def test_hint_limit_enforcement(self, client, created_session):
        """CRITICAL: Verify hint limit is enforced"""
        # Request all available hints
        for level in range(1, ExerciseConstants.MAX_HINTS + 1):
            response = client.post(
                f"/api/sessions/{created_session['id']}/hint",
                json={"hint_level": level},
            )
            assert response.status_code == 200

        # Request invalid hint level (should fail with validation error)
        response = client.post(
            f"/api/sessions/{created_session['id']}/hint",
            json={"hint_level": ExerciseConstants.MAX_HINTS + 1},
        )
        # Schema validation rejects hint_level > 3 before business logic
        assert response.status_code == 422


class TestCompleteUserJourney:
    """Test complete end-to-end user journeys"""

    def test_complete_learning_flow(self, client):
        """CRITICAL: Test complete flow from module generation to completion"""
        with patch("routers.modules.generate_module") as mock_generate:
            with patch("routers.sessions.evaluate_answer") as mock_evaluate:
                # Setup mocks
                mock_generate.return_value = {
                    "title": "Journey Test Module",
                    "domain": "Testing",
                    "skill_level": "beginner",
                    "exercises": [
                        create_complete_exercise(
                            sequence=1,
                            name="Question 1",
                            question="Q1",
                        ),
                        create_complete_exercise(
                            sequence=2,
                            name="Question 2",
                            question="Q2",
                        ),
                    ],
                }

                mock_evaluate.return_value = {
                    "assessment": "strong",
                    "internal_score": 90,
                    "feedback": "Excellent!",
                }

                # Step 1: Generate module
                module_response = client.post(
                    "/api/modules/generate",
                    json={"topic": "Testing", "skill_level": "beginner"},
                )
                assert module_response.status_code == 201
                module = module_response.json()
                module_id = module["id"]

                try:
                    # Step 2: Create session
                    session_response = client.post(
                        "/api/sessions", json={"module_id": module_id}
                    )
                    assert session_response.status_code == 201
                    session = session_response.json()
                    session_id = session["id"]

                    # Step 3: Submit answer to first exercise
                    answer1_response = client.post(
                        f"/api/sessions/{session_id}/submit",
                        json={
                            "answer_text": "Answer to Q1",
                            "time_spent_seconds": 120,
                            "hints_used": 0,
                            "exercise_index": 0,
                        },
                    )
                    assert answer1_response.status_code == 200
                    assert answer1_response.json()["assessment"] == "strong"

                    # Step 4: Advance to next exercise
                    update_response = client.patch(
                        f"/api/sessions/{session_id}",
                        json={"current_exercise_index": 1},
                    )
                    assert update_response.status_code == 200

                    # Step 5: Submit answer to second exercise
                    answer2_response = client.post(
                        f"/api/sessions/{session_id}/submit",
                        json={
                            "answer_text": "Answer to Q2",
                            "time_spent_seconds": 100,
                            "hints_used": 1,
                            "exercise_index": 1,
                        },
                    )
                    assert answer2_response.status_code == 200

                    # Step 6: Mark session as completed
                    complete_response = client.patch(
                        f"/api/sessions/{session_id}",
                        json={"status": "completed", "confidence_rating": 4},
                    )
                    assert complete_response.status_code == 200
                    completed_session = complete_response.json()
                    assert completed_session["status"] == "completed"
                    assert completed_session["confidence_rating"] == 4
                    assert completed_session["completed_at"] is not None

                    # Verify final state
                    final_session = client.get(f"/api/sessions/{session_id}").json()
                    assert len(final_session["attempts"]) == 2

                finally:
                    # Cleanup
                    execute_query("DELETE FROM sessions WHERE id = %s", (session_id,))
                    execute_query("DELETE FROM modules WHERE id = %s", (module_id,))


class TestJSONBOperationsIntegrity:
    """Test JSONB data integrity"""

    def test_jsonb_exercises_array_integrity(self, client, created_module):
        """CRITICAL: Verify JSONB exercises array isn't corrupted"""
        # Retrieve module
        response = client.get(f"/api/modules/{created_module['id']}")
        module = response.json()

        # Verify exercises is a proper array
        assert isinstance(module["exercises"], list)
        assert len(module["exercises"]) > 0

        # Verify each exercise has required fields
        for exercise in module["exercises"]:
            assert isinstance(exercise, dict)
            assert "prompt" in exercise
            assert "name" in exercise
            # Hints are optional and generated on-demand incrementally
            if "hints" in exercise and exercise["hints"] is not None:
                assert isinstance(exercise["hints"], list)
                # Hints are generated one at a time, so length can be 0 to MAX_HINTS
                assert 0 <= len(exercise["hints"]) <= ExerciseConstants.MAX_HINTS

    def test_jsonb_attempts_array_integrity(self, client, created_session):
        """CRITICAL: Verify JSONB attempts array maintains integrity"""
        with patch("routers.sessions.evaluate_answer") as mock_evaluate:
            mock_evaluate.return_value = {
                "assessment": "strong",
                "internal_score": 85,
                "feedback": "Good",
            }

            # Submit multiple answers
            for i in range(3):
                response = client.post(
                    f"/api/sessions/{created_session['id']}/submit",
                    json={
                        "answer_text": f"This is test answer number {i}",
                        "time_spent_seconds": 60,
                        "hints_used": i,
                        "exercise_index": 0,
                    },
                )
                assert (
                    response.status_code == 200
                ), f"Submission {i} failed: {response.json()}"

            # Retrieve session and verify attempts
            response = client.get(f"/api/sessions/{created_session['id']}")
            session = response.json()

            assert isinstance(session["attempts"], list)
            assert len(session["attempts"]) == 3

            # Verify each attempt is a proper dict with all fields
            for idx, attempt in enumerate(session["attempts"]):
                assert isinstance(attempt, dict)
                assert attempt["answer_text"] == f"This is test answer number {idx}"
                assert attempt["attempt_number"] == idx + 1
                assert attempt["hints_used"] == idx
                assert "created_at" in attempt


class TestErrorHandlingInCriticalFlows:
    """Test error handling in critical flows"""

    def test_completed_session_immutable(self, client, completed_session):
        """CRITICAL: Verify completed sessions cannot be modified"""
        # Try to submit answer
        response = client.post(
            f"/api/sessions/{completed_session['id']}/submit",
            json={
                "answer_text": "Should fail",
                "time_spent_seconds": 60,
                "hints_used": 0,
                "exercise_index": 0,
            },
        )
        assert response.status_code == 400
        assert "completed" in response.json()["detail"].lower()

        # Try to request hint
        response = client.post(f"/api/sessions/{completed_session['id']}/hint", json={})
        assert response.status_code == 400
        assert "completed" in response.json()["detail"].lower()
