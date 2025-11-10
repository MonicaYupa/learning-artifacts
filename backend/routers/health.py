"""
Health Check Router
Provides endpoints to check API and database health
"""

from fastapi import APIRouter, status
from datetime import datetime

from models.schemas import HealthResponse
from config.database import test_db_connection

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check API and database connection status"
)
async def health_check():
    """
    Health check endpoint

    Returns:
        HealthResponse with status of API and database
    """
    # Test database connection
    db_status = "connected" if await test_db_connection() else "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        timestamp=datetime.now()
    )


@router.get(
    "/ping",
    status_code=status.HTTP_200_OK,
    summary="Ping",
    description="Simple ping endpoint to check if API is running"
)
async def ping():
    """
    Simple ping endpoint

    Returns:
        Pong message
    """
    return {"message": "pong"}
