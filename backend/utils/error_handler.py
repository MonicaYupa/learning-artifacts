"""
Error Handling Utilities
Provides secure error handling with logging and environment-aware error messages
"""

import logging
from typing import Optional

from config.settings import settings
from fastapi import HTTPException, status

# Configure logger
logger = logging.getLogger(__name__)


def log_and_raise_http_error(
    status_code: int,
    public_message: str,
    error: Optional[Exception] = None,
    log_level: str = "error",
) -> None:
    """
    Log detailed error information and raise HTTPException with environment-appropriate message.

    In development: Returns detailed error messages for debugging
    In production: Returns generic error messages to prevent information leakage

    Args:
        status_code: HTTP status code to return
        public_message: Generic message safe to show users in production
        error: The original exception (optional)
        log_level: Logging level (debug, info, warning, error, critical)

    Raises:
        HTTPException: Always raises with appropriate detail message
    """
    # Log the detailed error server-side
    log_func = getattr(logger, log_level.lower(), logger.error)

    if error:
        log_func(
            f"Error occurred: {public_message}",
            exc_info=True,
            extra={
                "status_code": status_code,
                "error_type": type(error).__name__,
                "error_message": str(error),
            },
        )
    else:
        log_func(
            f"Error occurred: {public_message}",
            extra={"status_code": status_code},
        )

    # Determine what detail to send to client
    if settings.ENVIRONMENT == "development":
        # In development, include detailed error information
        detail = f"{public_message}: {str(error)}" if error else public_message
    else:
        # In production, only return the generic public message
        detail = public_message

    raise HTTPException(status_code=status_code, detail=detail)


def safe_error_detail(
    public_message: str,
    error: Optional[Exception] = None,
) -> str:
    """
    Return environment-appropriate error detail string.

    Args:
        public_message: Generic message safe to show users
        error: The original exception (optional)

    Returns:
        Detailed message in development, generic message in production
    """
    if settings.ENVIRONMENT == "development" and error:
        return f"{public_message}: {str(error)}"
    return public_message


def extract_retry_after(error: Exception) -> Optional[int]:
    """
    Extract retry_after value from an exception.

    Checks both the error's retry_after attribute and response headers.

    Args:
        error: The exception to extract retry_after from

    Returns:
        Number of seconds until retry is allowed, or None if not available
    """
    # First try to get from error attribute
    retry_after = getattr(error, "retry_after", None)

    # If not found, try response headers
    if retry_after is None and hasattr(error, "response"):
        if hasattr(error.response, "headers"):
            retry_after_str = error.response.headers.get("retry-after")
            if retry_after_str:
                try:
                    retry_after = int(float(retry_after_str))
                except ValueError:
                    retry_after = None

    return retry_after


def log_and_raise_rate_limit_error(
    public_message: str,
    error: Optional[Exception] = None,
    retry_after: Optional[int] = None,
) -> None:
    """
    Log and raise a 429 rate limit error with optional Retry-After header.

    Args:
        public_message: Generic message safe to show users
        error: The original exception (optional)
        retry_after: Seconds until retry is allowed (optional)

    Raises:
        HTTPException: 429 error with Retry-After header and retry_after in response body
    """
    # Log the error at ERROR level since rate limits are system-level concerns
    logger.error(
        f"Rate limit error: {public_message}",
        extra={
            "status_code": status.HTTP_429_TOO_MANY_REQUESTS,
            "retry_after": retry_after,
            "error_type": type(error).__name__ if error else None,
            "error_message": str(error) if error else None,
        },
    )

    # Determine detail message
    if settings.ENVIRONMENT == "development":
        message = f"{public_message}: {str(error)}" if error else public_message
    else:
        message = public_message

    # Create response detail with retry_after in JSON body
    if retry_after is not None:
        detail = {"message": message, "retry_after": retry_after}
    else:
        detail = {"message": message}

    # Create exception with Retry-After header if available
    headers = {}
    if retry_after is not None:
        headers["Retry-After"] = str(int(retry_after))

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=detail,
        headers=headers if headers else None,
    )


# Common HTTP status codes for convenience
HTTP_400_BAD_REQUEST = status.HTTP_400_BAD_REQUEST
HTTP_401_UNAUTHORIZED = status.HTTP_401_UNAUTHORIZED
HTTP_403_FORBIDDEN = status.HTTP_403_FORBIDDEN
HTTP_404_NOT_FOUND = status.HTTP_404_NOT_FOUND
HTTP_429_TOO_MANY_REQUESTS = status.HTTP_429_TOO_MANY_REQUESTS
HTTP_500_INTERNAL_SERVER_ERROR = status.HTTP_500_INTERNAL_SERVER_ERROR
