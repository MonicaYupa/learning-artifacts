"""
Retry Handler with Exponential Backoff
Handles automatic retries for Claude API calls with transient failures
"""

import asyncio
import inspect
import logging
import random
import time
from functools import wraps
from typing import Any, Callable, Tuple, Type

from anthropic import APIError, APIStatusError, APITimeoutError, RateLimitError
from config.constants import RetryConstants

logger = logging.getLogger(__name__)

# Retryable exception types
RETRYABLE_EXCEPTIONS = (
    RateLimitError,
    APITimeoutError,
    APIError,  # Generic API errors (network issues, etc.)
)


def exponential_backoff_with_jitter(
    attempt: int, base_delay: float = 1.0, max_delay: float = 60.0
) -> float:
    """
    Calculate exponential backoff delay with jitter

    Args:
        attempt: Current retry attempt (1-indexed)
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds

    Returns:
        Delay in seconds with random jitter
    """
    # Calculate exponential delay: base_delay * (2 ^ (attempt - 1))
    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)

    # Add jitter: randomize between 0 and calculated delay
    jittered_delay = delay * random.uniform(0.5, 1.0)

    return jittered_delay


def should_retry(
    exception: Exception, attempt: int, max_retries: int
) -> Tuple[bool, float]:
    """
    Determine if an exception should trigger a retry

    Args:
        exception: The exception that occurred
        attempt: Current attempt number (1-indexed)
        max_retries: Maximum number of retries allowed

    Returns:
        Tuple of (should_retry, retry_after_seconds)
    """
    # Don't retry if we've exhausted attempts
    if attempt > max_retries:
        return False, 0.0

    # Check for rate limit with Retry-After header
    if isinstance(exception, RateLimitError):
        # Try to extract retry-after from the error
        retry_after = getattr(exception, "retry_after", None)
        if retry_after:
            logger.info(
                f"Rate limited. Retry after {retry_after}s (attempt {attempt}/{max_retries})"
            )
            return True, float(retry_after)
        else:
            # Fallback to exponential backoff
            delay = exponential_backoff_with_jitter(attempt, base_delay=2.0)
            logger.info(
                f"Rate limited. Retry in {delay:.2f}s (attempt {attempt}/{max_retries})"
            )
            return True, delay

    # Check for API status errors with retryable status codes
    if isinstance(exception, APIStatusError):
        if exception.status_code in RetryConstants.RETRYABLE_STATUS_CODES:
            delay = exponential_backoff_with_jitter(attempt)
            logger.warning(
                f"API error {exception.status_code}. Retry in {delay:.2f}s "
                f"(attempt {attempt}/{max_retries})"
            )
            return True, delay
        else:
            # Non-retryable status code (e.g., 400, 401, 404)
            logger.error(f"Non-retryable API error: {exception.status_code}")
            return False, 0.0

    # Check for timeout errors
    if isinstance(exception, APITimeoutError):
        delay = exponential_backoff_with_jitter(attempt, base_delay=2.0)
        logger.warning(
            f"API timeout. Retry in {delay:.2f}s (attempt {attempt}/{max_retries})"
        )
        return True, delay

    # Check for generic API errors (network issues)
    if isinstance(exception, APIError):
        delay = exponential_backoff_with_jitter(attempt)
        logger.warning(
            f"API error: {str(exception)}. Retry in {delay:.2f}s "
            f"(attempt {attempt}/{max_retries})"
        )
        return True, delay

    # Non-retryable exception
    logger.error(
        f"Non-retryable exception: {type(exception).__name__}: {str(exception)}"
    )
    return False, 0.0


def with_retry(
    max_retries: int = 2,
    timeout: float = 60.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = RETRYABLE_EXCEPTIONS,
):
    """
    Decorator to add automatic retry logic with exponential backoff
    Supports both sync and async functions

    Args:
        max_retries: Maximum number of retry attempts (default: 2)
        timeout: Timeout for each API call in seconds (default: 60)
        retryable_exceptions: Tuple of exception types to retry on

    Usage:
        @with_retry(max_retries=2, timeout=60.0)
        async def my_async_api_call():
            return await client.messages.create(...)

        @with_retry(max_retries=2, timeout=60.0)
        def my_sync_api_call():
            return client.messages.create(...)
    """

    def decorator(func: Callable) -> Callable:
        # Check if function is async
        is_async = inspect.iscoroutinefunction(func)

        if is_async:

            @wraps(func)
            async def async_wrapper(*args, **kwargs) -> Any:
                # Add timeout to kwargs if not already present
                if "timeout" not in kwargs and timeout:
                    kwargs["timeout"] = timeout

                attempt = 0
                last_exception = None

                while attempt <= max_retries:
                    attempt += 1

                    try:
                        # Attempt the function call
                        result = await func(*args, **kwargs)

                        # Log successful retry if this wasn't the first attempt
                        if attempt > 1:
                            func_name = getattr(func, "__name__", "function")
                            logger.info(
                                f"{func_name} succeeded on attempt {attempt}/{max_retries + 1}"
                            )

                        return result

                    except retryable_exceptions as e:
                        last_exception = e

                        # Check if we should retry
                        should_retry_result, delay = should_retry(
                            e, attempt, max_retries
                        )

                        if should_retry_result:
                            # Wait before retrying (async sleep)
                            logger.info(f"Waiting {delay:.2f}s before retry...")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            # Non-retryable or exhausted retries
                            func_name = getattr(func, "__name__", "function")
                            logger.error(
                                f"{func_name} failed after {attempt} attempt(s): "
                                f"{type(e).__name__}: {str(e)}"
                            )
                            raise

                    except Exception as e:
                        # Non-retryable exception, raise immediately
                        func_name = getattr(func, "__name__", "function")
                        logger.error(
                            f"{func_name} failed with non-retryable error: "
                            f"{type(e).__name__}: {str(e)}"
                        )
                        raise

                # If we get here, we've exhausted all retries
                func_name = getattr(func, "__name__", "function")
                logger.error(f"{func_name} failed after {max_retries + 1} attempts")
                if last_exception:
                    raise last_exception
                else:
                    raise Exception(
                        f"{func.__name__} failed after {max_retries + 1} attempts"
                    )

            return async_wrapper

        else:

            @wraps(func)
            def sync_wrapper(*args, **kwargs) -> Any:
                # Add timeout to kwargs if not already present
                if "timeout" not in kwargs and timeout:
                    kwargs["timeout"] = timeout

                attempt = 0
                last_exception = None

                while attempt <= max_retries:
                    attempt += 1

                    try:
                        # Attempt the function call
                        result = func(*args, **kwargs)

                        # Log successful retry if this wasn't the first attempt
                        if attempt > 1:
                            func_name = getattr(func, "__name__", "function")
                            logger.info(
                                f"{func_name} succeeded on attempt {attempt}/{max_retries + 1}"
                            )

                        return result

                    except retryable_exceptions as e:
                        last_exception = e

                        # Check if we should retry
                        should_retry_result, delay = should_retry(
                            e, attempt, max_retries
                        )

                        if should_retry_result:
                            # Wait before retrying (sync sleep)
                            logger.info(f"Waiting {delay:.2f}s before retry...")
                            time.sleep(delay)
                            continue
                        else:
                            # Non-retryable or exhausted retries
                            func_name = getattr(func, "__name__", "function")
                            logger.error(
                                f"{func_name} failed after {attempt} attempt(s): "
                                f"{type(e).__name__}: {str(e)}"
                            )
                            raise

                    except Exception as e:
                        # Non-retryable exception, raise immediately
                        func_name = getattr(func, "__name__", "function")
                        logger.error(
                            f"{func_name} failed with non-retryable error: "
                            f"{type(e).__name__}: {str(e)}"
                        )
                        raise

                # If we get here, we've exhausted all retries
                func_name = getattr(func, "__name__", "function")
                logger.error(f"{func_name} failed after {max_retries + 1} attempts")
                if last_exception:
                    raise last_exception
                else:
                    raise Exception(
                        f"{func.__name__} failed after {max_retries + 1} attempts"
                    )

            return sync_wrapper

    return decorator
