"""
Modules Router
Provides endpoints for module generation, retrieval, and storage
"""

import json
from typing import List

from config.database import execute_query
from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user, get_current_user_id
from models.schemas import (
    ErrorResponse,
    ModuleGenerateRequest,
    ModuleListItem,
    ModuleResponse,
)
from services.claude_service import extract_topic_and_level, generate_module
from utils.error_handler import log_and_raise_http_error, safe_error_detail

router = APIRouter()


@router.get(
    "/modules",
    response_model=List[ModuleListItem],
    status_code=status.HTTP_200_OK,
    summary="List User's Modules",
    description="Retrieve a list of modules owned by the authenticated user",
)
async def list_modules(user_id: str = Depends(get_current_user_id)):
    """
    List all modules for the authenticated user

    Args:
        user_id: Current user's ID (from JWT token)

    Returns:
        List of module summaries (without full exercise details)
    """
    try:
        query = """
            SELECT
                id,
                title,
                domain,
                skill_level,
                jsonb_array_length(exercises) as exercise_count,
                (
                    SELECT SUM((exercise->>'estimated_minutes')::int)
                    FROM jsonb_array_elements(exercises) as exercise
                ) as estimated_minutes,
                created_at
            FROM modules
            WHERE user_id = %s
            ORDER BY created_at DESC
        """

        modules = execute_query(query, (user_id,))
        return modules if modules else []

    except Exception as e:
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Failed to retrieve modules",
            error=e,
        )


@router.get(
    "/modules/{module_id}",
    response_model=ModuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Module by ID",
    description="Retrieve a specific module with full exercise details (user must own the module)",
    responses={
        404: {"model": ErrorResponse, "description": "Module not found"},
        403: {
            "model": ErrorResponse,
            "description": "Access denied - module belongs to another user",
        },
    },
)
async def get_module(module_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get a specific module by ID with full exercise details

    Args:
        module_id: UUID of the module to retrieve
        user_id: Current user's ID (from JWT token)

    Returns:
        Module with full exercise details

    Raises:
        403: User doesn't own this module
        404: Module not found
    """
    try:
        query = """
            SELECT
                id,
                title,
                domain,
                skill_level,
                exercises,
                created_at,
                user_id
            FROM modules
            WHERE id = %s
        """

        module = execute_query(query, (module_id,), fetch_one=True)

        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with id {module_id} not found",
            )

        # Verify ownership
        if module["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied - you don't have permission to view this module",
            )

        # Remove user_id from response (not in ModuleResponse schema)
        module.pop("user_id", None)

        return module

    except HTTPException:
        raise
    except Exception as e:
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Failed to retrieve module",
            error=e,
        )


@router.post(
    "/modules/generate",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate New Module",
    description="Generate a new learning module using Claude API based on topic and skill level",
    responses={
        429: {"model": ErrorResponse, "description": "Claude API rate limit exceeded"},
        500: {"model": ErrorResponse, "description": "Module generation failed"},
    },
)
async def generate_new_module(
    request: ModuleGenerateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Generate a new learning module using Claude API

    Args:
        request: Module generation parameters (message OR topic+skill_level, exercise_count)
        user_id: Current user's ID (from JWT token)

    Returns:
        Generated module with full exercise details

    Raises:
        429: Rate limit exceeded
        500: Module generation or storage failed
    """
    try:
        # Extract topic and skill level from message if provided
        if request.message:
            extracted = extract_topic_and_level(request.message)
            topic = extracted["topic"]
            skill_level = extracted["skill_level"]
        elif request.topic and request.skill_level:
            topic = request.topic
            skill_level = request.skill_level.value
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'message' or both 'topic' and 'skill_level' must be provided",
            )

        # Generate module using Claude API
        module_data = generate_module(
            topic=topic,
            skill_level=skill_level,
            exercise_count=request.exercise_count,
        )

        # Store module in database with user_id
        query = """
            INSERT INTO modules (user_id, title, domain, skill_level, exercises)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, title, domain, skill_level, exercises, created_at
        """

        # Convert exercises list to JSON string for JSONB column
        exercises_json = json.dumps(module_data["exercises"])

        created_module = execute_query(
            query,
            (
                user_id,
                module_data["title"],
                module_data["domain"],
                module_data["skill_level"],
                exercises_json,
            ),
            fetch_one=True,
        )

        if not created_module:
            raise Exception("Failed to store module in database")

        return created_module

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)

        # Check for rate limiting
        if "rate limit" in error_message.lower() or "429" in error_message:
            log_and_raise_http_error(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                public_message="Claude API rate limit exceeded. Please try again later.",
                error=e,
            )

        # General error
        log_and_raise_http_error(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            public_message="Module generation failed",
            error=e,
        )
