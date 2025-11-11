"""
Utility modules for the application
"""

from .error_handler import log_and_raise_http_error, safe_error_detail

__all__ = [
    "log_and_raise_http_error",
    "safe_error_detail",
]
