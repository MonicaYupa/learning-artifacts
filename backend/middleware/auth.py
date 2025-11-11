"""
JWT Authentication Middleware
Verifies Supabase JWT tokens using JWT signing keys (RS256)
"""

import logging
import time
from typing import Optional

import httpx
from config.database import get_or_create_user
from config.settings import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.utils import base64url_decode
from utils.error_handler import safe_error_detail

# Configure logger
logger = logging.getLogger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()

# Cache for JWKS (JSON Web Key Set) with TTL
_jwks_cache: Optional[dict] = None
_jwks_cache_timestamp: Optional[float] = None
JWKS_CACHE_TTL_SECONDS = 86400  # 24 hours


async def get_supabase_jwks() -> dict:
    """
    Fetch Supabase JWKS (JSON Web Key Set) from the well-known endpoint
    Caches the result for 24 hours to avoid repeated requests

    Cache automatically expires after TTL to pick up key rotations

    Returns:
        JWKS dictionary containing public keys
    """
    global _jwks_cache, _jwks_cache_timestamp

    current_time = time.time()

    # Check if cache exists and is still valid
    if _jwks_cache is not None and _jwks_cache_timestamp is not None:
        if current_time - _jwks_cache_timestamp < JWKS_CACHE_TTL_SECONDS:
            return _jwks_cache

    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_url, timeout=10.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_timestamp = current_time
            return _jwks_cache
    except Exception as e:
        logger.error("Failed to fetch JWKS from Supabase", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=safe_error_detail("Failed to fetch authentication keys", e),
        )


async def decode_token(token: str) -> dict:
    """
    Decode and verify JWT token using Supabase's public key from JWKS or JWT secret

    Supports both legacy HS256 tokens and modern asymmetric tokens (ES256/RS256)

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Get the unverified header to determine the algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")

        # Handle HS256 (legacy symmetric key tokens)
        if alg == "HS256":
            # For HS256, use the JWT secret from Supabase settings
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=["HS256"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                },
            )
            return payload

        # Handle ES256/RS256 (modern asymmetric key tokens via JWKS)
        # Fetch JWKS from Supabase
        jwks = await get_supabase_jwks()

        # Find the key with matching kid
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing 'kid' in header",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Find the matching key in JWKS
        key = None
        for jwk_key in jwks.get("keys", []):
            if jwk_key.get("kid") == kid:
                key = jwk_key
                break

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No matching key found in JWKS",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Decode and verify the token using the public key
        payload = jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": False,  # Supabase tokens may not have aud claim
            },
        )
        return payload

    except JWTError as e:
        logger.warning(
            f"JWT validation error: {str(e)}", extra={"error_type": type(e).__name__}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=safe_error_detail("Invalid authentication credentials", e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error("Token verification failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=safe_error_detail("Token verification failed", e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
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

    # Decode and verify token using JWKS
    payload = await decode_token(token)

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
        logger.error("Error fetching user from database", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=safe_error_detail("Error fetching user", e),
        )


async def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    """
    Dependency to get just the current user's ID

    Args:
        user: Current user from get_current_user dependency

    Returns:
        User ID (UUID as string)
    """
    return str(user["id"])
