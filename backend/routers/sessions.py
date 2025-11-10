"""
Sessions Router
Provides endpoints for session management, answer submission, and hint requests
"""

import json
from datetime import datetime

from config.database import execute_query
from fastapi import APIRouter, HTTPException, status
from models.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    ErrorResponse,
    HintRequest,
    HintResponse,
    SessionCreateRequest,
    SessionResponse,
    SessionUpdateRequest,
)
from services.claude_service import evaluate_answer

router = APIRouter()


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Session",
    description="Create a new learning session for a specific module",
    responses={404: {"model": ErrorResponse, "description": "Module not found"}},
)
async def create_session(request: SessionCreateRequest):
    """
    Create a new learning session for a module

    Args:
        request: Session creation parameters (module_id)

    Returns:
        Created session with initial state

    Raises:
        404: Module not found
        500: Session creation failed
    """
    try:
        # Verify module exists
        module_query = "SELECT id FROM modules WHERE id = %s"
        module = execute_query(module_query, (request.module_id,), fetch_one=True)

        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with id {request.module_id} not found",
            )

        # Get or create default test user (will be replaced with auth in Phase 4)
        user_query = "SELECT id FROM users LIMIT 1"
        user = execute_query(user_query, fetch_one=True)

        if not user:
            # Create default test user if none exists
            user = execute_query(
                "INSERT INTO users (email) VALUES ('test@example.com') RETURNING id",
                fetch_one=True,
            )

        user_id = user["id"]

        # Create session
        create_query = """
            INSERT INTO sessions (user_id, module_id, current_exercise_index, attempts, status)
            VALUES (%s, %s, 0, '[]'::jsonb, 'in_progress')
            RETURNING id, user_id, module_id, current_exercise_index, attempts,
                      status, confidence_rating, started_at, completed_at
        """

        session = execute_query(
            create_query, (user_id, request.module_id), fetch_one=True
        )

        if not session:
            raise Exception("Failed to create session in database")

        return session

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session creation failed: {str(e)}",
        )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Session by ID",
    description="Retrieve a specific session with full attempt history",
    responses={404: {"model": ErrorResponse, "description": "Session not found"}},
)
async def get_session(session_id: str):
    """
    Get a specific session by ID with full attempt history

    Args:
        session_id: UUID of the session to retrieve

    Returns:
        Session with full attempt details

    Raises:
        404: Session not found
    """
    try:
        query = """
            SELECT
                id,
                user_id,
                module_id,
                current_exercise_index,
                attempts,
                status,
                confidence_rating,
                started_at,
                completed_at
            FROM sessions
            WHERE id = %s
        """

        session = execute_query(query, (session_id,), fetch_one=True)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id {session_id} not found",
            )

        return session

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session: {str(e)}",
        )


@router.patch(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Session",
    description="Update session state (current exercise, status, confidence rating)",
    responses={404: {"model": ErrorResponse, "description": "Session not found"}},
)
async def update_session(session_id: str, request: SessionUpdateRequest):
    """
    Update session state

    Args:
        session_id: UUID of the session to update
        request: Session update parameters

    Returns:
        Updated session

    Raises:
        404: Session not found
        400: Invalid update request
    """
    try:
        # Build dynamic update query based on provided fields
        update_fields = []
        params = []

        if request.current_exercise_index is not None:
            update_fields.append("current_exercise_index = %s")
            params.append(request.current_exercise_index)

        if request.status is not None:
            update_fields.append("status = %s")
            params.append(request.status.value)

            # If marking as completed, set completed_at
            if request.status.value == "completed":
                update_fields.append("completed_at = NOW()")

        if request.confidence_rating is not None:
            update_fields.append("confidence_rating = %s")
            params.append(request.confidence_rating)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update",
            )

        # Add session_id to params
        params.append(session_id)

        query = f"""
            UPDATE sessions
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, user_id, module_id, current_exercise_index, attempts,
                      status, confidence_rating, started_at, completed_at
        """

        session = execute_query(query, tuple(params), fetch_one=True)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id {session_id} not found",
            )

        return session

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session update failed: {str(e)}",
        )


@router.post(
    "/sessions/{session_id}/submit",
    response_model=AnswerSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit Answer",
    description="Submit an answer for evaluation and receive feedback",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        429: {"model": ErrorResponse, "description": "Claude API rate limit exceeded"},
    },
)
async def submit_answer(session_id: str, request: AnswerSubmitRequest):
    """
    Submit an answer for evaluation

    Args:
        session_id: UUID of the session
        request: Answer submission with text, time spent, and hints used

    Returns:
        Evaluation result with feedback and advancement decision

    Raises:
        404: Session not found
        429: Rate limit exceeded
        500: Evaluation failed
    """
    try:
        # Get session and current exercise
        session_query = """
            SELECT s.id, s.current_exercise_index, s.attempts, s.status,
                   m.exercises
            FROM sessions s
            JOIN modules m ON s.module_id = m.id
            WHERE s.id = %s
        """

        session = execute_query(session_query, (session_id,), fetch_one=True)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id {session_id} not found",
            )

        if session["status"] == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit answer for completed session",
            )

        # Get current exercise
        current_idx = session["current_exercise_index"]
        exercises = session["exercises"]

        if current_idx >= len(exercises):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All exercises completed",
            )

        current_exercise = exercises[current_idx]

        # Count attempts for this exercise
        attempts = session["attempts"]
        exercise_attempts = [
            a for a in attempts if a.get("exercise_index") == current_idx
        ]
        attempt_number = len(exercise_attempts) + 1

        # Check if max attempts reached (3 attempts)
        if attempt_number > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum attempts (3) reached for this exercise",
            )

        # Evaluate answer using Claude
        evaluation = evaluate_answer(
            exercise=current_exercise,
            answer_text=request.answer_text,
            hints_used=request.hints_used,
        )

        # Create attempt record
        attempt = {
            "exercise_index": current_idx,
            "attempt_number": attempt_number,
            "answer_text": request.answer_text,
            "time_spent_seconds": request.time_spent_seconds,
            "hints_used": request.hints_used,
            "assessment": evaluation["assessment"],
            "internal_score": evaluation["internal_score"],
            "feedback": evaluation["feedback"],
            "should_advance": evaluation["should_advance"],
            "created_at": datetime.utcnow().isoformat(),
        }

        # Append attempt to attempts array
        attempts.append(attempt)

        # Update session with new attempt
        update_query = """
            UPDATE sessions
            SET attempts = %s::jsonb
            WHERE id = %s
        """

        execute_query(update_query, (json.dumps(attempts), session_id))

        # Check if hint is available (if user hasn't used all 3 hints)
        hint_available = request.hints_used < 3

        # Check if model answer is available (after 3 attempts or strong assessment)
        model_answer_available = attempt_number >= 3 or evaluation["should_advance"]

        return {
            "assessment": evaluation["assessment"],
            "internal_score": evaluation["internal_score"],
            "feedback": evaluation["feedback"],
            "should_advance": evaluation["should_advance"],
            "attempt_number": attempt_number,
            "hint_available": hint_available,
            "model_answer_available": model_answer_available,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)

        # Check for rate limiting
        if "rate limit" in error_message.lower() or "429" in error_message:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Claude API rate limit exceeded. Please try again later.",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Answer submission failed: {error_message}",
        )


@router.post(
    "/sessions/{session_id}/hint",
    response_model=HintResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Hint",
    description="Request a progressive hint for the current exercise",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        400: {"model": ErrorResponse, "description": "Invalid hint request"},
    },
)
async def request_hint(session_id: str, request: HintRequest):
    """
    Request a progressive hint for the current exercise

    Args:
        session_id: UUID of the session
        request: Hint request (optional hint_level)

    Returns:
        Hint text with level information

    Raises:
        404: Session not found
        400: Invalid hint request or no hints available
    """
    try:
        # Get session and current exercise
        session_query = """
            SELECT s.id, s.current_exercise_index, s.attempts, s.status,
                   m.exercises
            FROM sessions s
            JOIN modules m ON s.module_id = m.id
            WHERE s.id = %s
        """

        session = execute_query(session_query, (session_id,), fetch_one=True)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id {session_id} not found",
            )

        if session["status"] == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot request hint for completed session",
            )

        # Get current exercise
        current_idx = session["current_exercise_index"]
        exercises = session["exercises"]

        if current_idx >= len(exercises):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All exercises completed",
            )

        current_exercise = exercises[current_idx]

        # Get attempts for current exercise to determine hint level
        attempts = session["attempts"]
        exercise_attempts = [
            a for a in attempts if a.get("exercise_index") == current_idx
        ]

        # Determine hint level
        if request.hint_level is not None:
            # Use requested level if valid
            if not (1 <= request.hint_level <= 3):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Hint level must be between 1 and 3",
                )
            hint_level = request.hint_level
        else:
            # Calculate next available hint level
            max_hints_used = 0
            if exercise_attempts:
                max_hints_used = max(a.get("hints_used", 0) for a in exercise_attempts)

            hint_level = max_hints_used + 1

            if hint_level > 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="All hints have been used for this exercise",
                )

        # Get hint text (hints are 0-indexed in array, but 1-indexed for user)
        hints = current_exercise.get("hints", [])
        if len(hints) < 3:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Exercise does not have sufficient hints",
            )

        hint_text = hints[hint_level - 1]
        hints_remaining = 3 - hint_level

        return {
            "hint_level": hint_level,
            "hint_text": hint_text,
            "hints_remaining": hints_remaining,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hint request failed: {str(e)}",
        )
