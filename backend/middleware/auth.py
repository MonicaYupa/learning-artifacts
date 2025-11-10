"""
JWT Authentication Middleware
Verifies Supabase JWT tokens and extracts user information
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx

from config.settings import settings
from config.database import get_or_create_user

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_supabase_jwt_secret():
    """
    Fetch Supabase JWT secret from the JWKS endpoint
    In production, cache this value to avoid repeated requests
    """
    # For Supabase, we can use the JWT_SECRET from settings
    # which is derived from the Supabase project's JWT secret
    return settings.JWT_SECRET


def decode_token(token: str) -> dict:
    """
    Decode and verify JWT token

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": False  # Supabase tokens may not have aud claim
            }
        )
        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to get the current authenticated user

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        User record from database

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials

    # Decode and verify token
    payload = decode_token(token)

    # Extract user email from token
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get or create user in database
    try:
        user = get_or_create_user(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )


async def get_current_user_id(
    user: dict = Depends(get_current_user)
) -> str:
    """
    Dependency to get just the current user's ID

    Args:
        user: Current user from get_current_user dependency

    Returns:
        User ID (UUID as string)
    """
    return str(user["id"])
