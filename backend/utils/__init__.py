"""
Utility modules for the application
"""

from .error_handler import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_429_TOO_MANY_REQUESTS,
    HTTP_500_INTERNAL_SERVER_ERROR,
    log_and_raise_http_error,
    safe_error_detail,
)

__all__ = [
    "log_and_raise_http_error",
    "safe_error_detail",
    "HTTP_400_BAD_REQUEST",
    "HTTP_401_UNAUTHORIZED",
    "HTTP_403_FORBIDDEN",
    "HTTP_404_NOT_FOUND",
    "HTTP_429_TOO_MANY_REQUESTS",
    "HTTP_500_INTERNAL_SERVER_ERROR",
]
