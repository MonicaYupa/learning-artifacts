"""
Sessions Router
Provides endpoints for session management, answer submission, and hint requests
"""

import json
from datetime import datetime

import psycopg
from anthropic import APITimeoutError, RateLimitError
from config.database import execute_query
from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user_id
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
from utils.error_handler import (
    extract_retry_after,
    log_and_raise_http_error,
    log_and_raise_rate_limit_error,
    safe_error_detail,
)

router = APIRouter()

# Constants for session limits
MAX_ATTEMPTS_PER_EXERCISE = 3
MAX_HINTS_PER_EXERCISE = 3


async def verify_session_ownership(session_id: str, user_id: str) -> dict:
    """
    Helper function to verify session exists and user owns it

    Args:
        session_id: UUID of the session
        user_id: Current user's ID

    Returns:
        Session data if authorized

    Raises:
        HTTPException: If session not found or user doesn't own it
    """
    query = "SELECT * FROM sessions WHERE id = %s"
    session = execute_query(query, (session_id,), fetch_one=True)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found",
        )

    if session["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied - you don't have permission to access this session",
        )

    return session


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Session",
    description="Create a new learning session for a specific module owned by the user",
    responses={
        404: {"model": ErrorResponse, "description": "Module not found"},
        403: {
            "model": ErrorResponse,
            "description": "Access denied - module belongs to another user",
        },
    },
)
async def create_session(
    request: SessionCreateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new learning session for a module

    Args:
        request: Session creation parameters (module_id)
        user_id: Current user's ID (from JWT token)

    Returns:
        Created session with initial state

    Raises:
        403: User doesn't own the module
        404: Module not found
        500: Session creation failed
    """
    try:
        # Verify module exists and user owns it
        module_query = "SELECT id, user_id FROM modules WHERE id = %s"
        module = execute_query(module_query, (request.module_id,), fetch_one=True)

        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with id {request.module_id} not found",
            )

        # Verify ownership
        if module["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you don't have permission to create a session for this module",
            )

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
    except psycopg.errors.QueryCanceled as e:
        log_and_raise_http_error(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            public_message="The database query timed out. Please try again.",
            error=e,
        )
    except Exception as e:
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Session creation failed",
            error=e,
        )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Session by ID",
    description="Retrieve a specific session with full attempt history (user must own the session)",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        403: {
            "model": ErrorResponse,
            "description": "Access denied - session belongs to another user",
        },
    },
)
async def get_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get a specific session by ID with full attempt history

    Args:
        session_id: UUID of the session to retrieve
        user_id: Current user's ID (from JWT token)

    Returns:
        Session with full attempt details

    Raises:
        403: User doesn't own this session
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

        # Verify ownership
        if session["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you don't have permission to view this session",
            )

        return session

    except HTTPException:
        raise
    except psycopg.errors.QueryCanceled as e:
        log_and_raise_http_error(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            public_message="The database query timed out. Please try again.",
            error=e,
        )
    except Exception as e:
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Failed to retrieve session",
            error=e,
        )


@router.patch(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Session",
    description="Update session state (current exercise, status, confidence rating)",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        403: {
            "model": ErrorResponse,
            "description": "Access denied - session belongs to another user",
        },
    },
)
async def update_session(
    session_id: str,
    request: SessionUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update session state

    Args:
        session_id: UUID of the session to update
        request: Session update parameters
        user_id: Current user's ID (from JWT token)

    Returns:
        Updated session

    Raises:
        403: User doesn't own this session
        404: Session not found
        400: Invalid update request
    """
    try:
        # Verify ownership
        await verify_session_ownership(session_id, user_id)

        # Whitelist of allowed column names to prevent SQL injection
        ALLOWED_COLUMNS = {
            "current_exercise_index",
            "status",
            "confidence_rating",
            "completed_at",
        }

        # Build dynamic update query based on provided fields
        update_clauses = []
        params = []

        if request.current_exercise_index is not None:
            column = "current_exercise_index"
            if column not in ALLOWED_COLUMNS:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid column name",
                )
            update_clauses.append(f"{column} = %s")
            params.append(request.current_exercise_index)

        if request.status is not None:
            column = "status"
            if column not in ALLOWED_COLUMNS:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid column name",
                )
            update_clauses.append(f"{column} = %s")
            params.append(request.status.value)

            # If marking as completed, set completed_at
            if request.status.value == "completed":
                completed_column = "completed_at"
                if completed_column not in ALLOWED_COLUMNS:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Invalid column name",
                    )
                update_clauses.append(f"{completed_column} = NOW()")

        if request.confidence_rating is not None:
            column = "confidence_rating"
            if column not in ALLOWED_COLUMNS:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid column name",
                )
            update_clauses.append(f"{column} = %s")
            params.append(request.confidence_rating)

        if not update_clauses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update",
            )

        # Add session_id to params
        params.append(session_id)

        # Build query with whitelisted columns only
        # All column names have been validated against ALLOWED_COLUMNS
        query = f"""
            UPDATE sessions
            SET {', '.join(update_clauses)}
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
    except psycopg.errors.QueryCanceled as e:
        log_and_raise_http_error(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            public_message="The database query timed out. Please try again.",
            error=e,
        )
    except Exception as e:
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Session update failed",
            error=e,
        )


@router.post(
    "/sessions/{session_id}/submit",
    response_model=AnswerSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit Answer",
    description="Submit an answer for evaluation and receive feedback",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        403: {
            "model": ErrorResponse,
            "description": "Access denied - session belongs to another user",
        },
        429: {"model": ErrorResponse, "description": "Claude API rate limit exceeded"},
    },
)
async def submit_answer(
    session_id: str,
    request: AnswerSubmitRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Submit an answer for evaluation

    Args:
        session_id: UUID of the session
        request: Answer submission with text, time spent, and hints used
        user_id: Current user's ID (from JWT token)

    Returns:
        Evaluation result with feedback and advancement decision

    Raises:
        403: User doesn't own this session
        404: Session not found
        429: Rate limit exceeded
        500: Evaluation failed
    """
    try:
        # Verify ownership first
        await verify_session_ownership(session_id, user_id)

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

        # Check if max attempts reached
        if attempt_number > MAX_ATTEMPTS_PER_EXERCISE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum attempts ({MAX_ATTEMPTS_PER_EXERCISE}) reached for this exercise",
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

        # Check if hint is available (if user hasn't used all hints)
        hint_available = request.hints_used < MAX_HINTS_PER_EXERCISE

        # Check if model answer is available (after max attempts or strong assessment)
        model_answer_available = (
            attempt_number >= MAX_ATTEMPTS_PER_EXERCISE or evaluation["should_advance"]
        )

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
    except APITimeoutError as e:
        log_and_raise_http_error(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            public_message="The Claude API request timed out. Please try again.",
            error=e,
        )
    except psycopg.errors.QueryCanceled as e:
        log_and_raise_http_error(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            public_message="The database query timed out. Please try again.",
            error=e,
        )
    except RateLimitError as e:
        log_and_raise_rate_limit_error(
            public_message="Claude API rate limit exceeded. Please try again later.",
            error=e,
            retry_after=extract_retry_after(e),
        )
    except Exception as e:
        error_message = str(e)

        # Check for rate limiting in error message (fallback)
        if "rate limit" in error_message.lower() or "429" in error_message:
            log_and_raise_rate_limit_error(
                public_message="Claude API rate limit exceeded. Please try again later.",
                error=e,
            )

        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Answer submission failed",
            error=e,
        )


@router.post(
    "/sessions/{session_id}/hint",
    response_model=HintResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Hint",
    description="Request a progressive hint for the current exercise",
    responses={
        404: {"model": ErrorResponse, "description": "Session not found"},
        403: {
            "model": ErrorResponse,
            "description": "Access denied - session belongs to another user",
        },
        400: {"model": ErrorResponse, "description": "Invalid hint request"},
    },
)
async def request_hint(
    session_id: str,
    request: HintRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Request a progressive hint for the current exercise

    Args:
        session_id: UUID of the session
        request: Hint request (optional hint_level)
        user_id: Current user's ID (from JWT token)

    Returns:
        Hint text with level information

    Raises:
        403: User doesn't own this session
        404: Session not found
        400: Invalid hint request or no hints available
    """
    try:
        # Verify ownership first
        await verify_session_ownership(session_id, user_id)

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
            if not (1 <= request.hint_level <= MAX_HINTS_PER_EXERCISE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Hint level must be between 1 and {MAX_HINTS_PER_EXERCISE}",
                )
            hint_level = request.hint_level
        else:
            # Calculate next available hint level
            max_hints_used = 0
            if exercise_attempts:
                max_hints_used = max(a.get("hints_used", 0) for a in exercise_attempts)

            hint_level = max_hints_used + 1

            if hint_level > MAX_HINTS_PER_EXERCISE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="All hints have been used for this exercise",
                )

        # Get hint text (hints are 0-indexed in array, but 1-indexed for user)
        hints = current_exercise.get("hints", [])
        if len(hints) < MAX_HINTS_PER_EXERCISE:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Exercise does not have sufficient hints",
            )

        hint_text = hints[hint_level - 1]
        hints_remaining = MAX_HINTS_PER_EXERCISE - hint_level

        return {
            "hint_level": hint_level,
            "hint_text": hint_text,
            "hints_remaining": hints_remaining,
        }

    except HTTPException:
        raise
    except psycopg.errors.QueryCanceled as e:
        log_and_raise_http_error(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            public_message="The database query timed out. Please try again.",
            error=e,
        )
    except Exception as e:
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Hint request failed",
            error=e,
        )
