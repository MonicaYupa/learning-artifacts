"""
Unit tests for retry handler module
Tests retry logic, exponential backoff, and error handling without making real API calls
"""

from unittest.mock import Mock, patch

import pytest
from anthropic import APIError, APIStatusError, APITimeoutError, RateLimitError
from utils.retry_handler import (
    exponential_backoff_with_jitter,
    should_retry,
    with_retry,
)


class TestExponentialBackoff:
    """Test exponential backoff calculation"""

    def test_backoff_increases_exponentially(self):
        """Verify backoff doubles with each attempt"""
        # First attempt: 0.5-1.0s (1.0 * 2^0 with 0.5-1.0 jitter)
        delay1 = exponential_backoff_with_jitter(1, base_delay=1.0)
        assert 0.5 <= delay1 <= 1.0

        # Second attempt: 1.0-2.0s (1.0 * 2^1 with jitter)
        delay2 = exponential_backoff_with_jitter(2, base_delay=1.0)
        assert 1.0 <= delay2 <= 2.0

        # Third attempt: 2.0-4.0s (1.0 * 2^2 with jitter)
        delay3 = exponential_backoff_with_jitter(3, base_delay=1.0)
        assert 2.0 <= delay3 <= 4.0

    def test_backoff_respects_max_delay(self):
        """Ensure backoff doesn't exceed max_delay"""
        # Even with high attempt number, should cap at max_delay
        delay = exponential_backoff_with_jitter(10, base_delay=1.0, max_delay=5.0)
        assert delay <= 5.0
        assert delay >= 2.5  # With jitter, minimum is 0.5 * max_delay

    def test_backoff_with_different_base_delays(self):
        """Test backoff calculation with different base values"""
        delay = exponential_backoff_with_jitter(1, base_delay=2.0)
        assert 1.0 <= delay <= 2.0  # 2.0 * 2^0 with jitter


class TestShouldRetry:
    """Test retry decision logic"""

    def test_rate_limit_error_should_retry(self):
        """Rate limit errors should trigger retry"""
        response_mock = Mock()
        response_mock.status_code = 429
        error = RateLimitError("Rate limited", response=response_mock, body=None)
        should_retry_result, delay = should_retry(error, attempt=1, max_retries=2)
        assert should_retry_result is True
        assert delay > 0

    def test_timeout_error_should_retry(self):
        """Timeout errors should trigger retry"""
        error = APITimeoutError("Timeout")
        should_retry_result, delay = should_retry(error, attempt=1, max_retries=2)
        assert should_retry_result is True
        assert delay > 0

    def test_generic_api_error_should_retry(self):
        """Generic API errors (network issues) should trigger retry"""
        request_mock = Mock()
        error = APIError("Network error", request=request_mock, body=None)
        should_retry_result, delay = should_retry(error, attempt=1, max_retries=2)
        assert should_retry_result is True
        assert delay > 0

    def test_retryable_status_codes_should_retry(self):
        """Server errors (5xx) and rate limits (429) should trigger retry"""
        for status_code in [429, 500, 502, 503, 504]:
            response_mock = Mock()
            response_mock.status_code = status_code
            error = APIStatusError("Server error", response=response_mock, body=None)
            should_retry_result, delay = should_retry(error, attempt=1, max_retries=2)
            assert (
                should_retry_result is True
            ), f"Status {status_code} should be retryable"
            assert delay > 0

    def test_non_retryable_status_codes_should_not_retry(self):
        """Client errors (4xx except 429) should not trigger retry"""
        for status_code in [400, 401, 403, 404]:
            response_mock = Mock()
            response_mock.status_code = status_code
            error = APIStatusError("Client error", response=response_mock, body=None)
            should_retry_result, delay = should_retry(error, attempt=1, max_retries=2)
            assert (
                should_retry_result is False
            ), f"Status {status_code} should not be retryable"

    def test_max_retries_exhausted_should_not_retry(self):
        """Should not retry when max retries exceeded"""
        response_mock = Mock()
        response_mock.status_code = 429
        error = RateLimitError("Rate limited", response=response_mock, body=None)
        should_retry_result, delay = should_retry(error, attempt=3, max_retries=2)
        assert should_retry_result is False
        assert delay == 0.0

    def test_non_api_error_should_not_retry(self):
        """Non-API errors (ValueError, etc.) should not trigger retry"""
        error = ValueError("Bad input")
        should_retry_result, delay = should_retry(error, attempt=1, max_retries=2)
        assert should_retry_result is False


class TestWithRetryDecorator:
    """Test the retry decorator"""

    def test_successful_first_attempt(self):
        """Function succeeds on first try - no retries needed"""
        mock_func = Mock(return_value="success")
        decorated = with_retry(max_retries=2)(mock_func)

        result = decorated()

        assert result == "success"
        assert mock_func.call_count == 1

    def test_retry_on_transient_error_then_succeed(self):
        """Function fails once with retryable error, then succeeds"""
        response_mock = Mock()
        response_mock.status_code = 429

        mock_func = Mock(
            side_effect=[
                RateLimitError("Rate limited", response=response_mock, body=None),
                "success",
            ]
        )

        with patch("time.sleep"):  # Skip actual sleep
            decorated = with_retry(max_retries=2)(mock_func)
            result = decorated()

        assert result == "success"
        assert mock_func.call_count == 2  # Initial attempt + 1 retry

    def test_max_retries_then_fail(self):
        """Function fails with retryable error until retries exhausted"""
        response_mock = Mock()
        response_mock.status_code = 429

        mock_func = Mock(
            side_effect=RateLimitError(
                "Rate limited", response=response_mock, body=None
            )
        )

        with patch("time.sleep"):
            decorated = with_retry(max_retries=2)(mock_func)

            with pytest.raises(RateLimitError):
                decorated()

        # 1 initial attempt + 2 retries = 3 total attempts
        assert mock_func.call_count == 3

    def test_non_retryable_error_fails_immediately(self):
        """Non-retryable errors should fail without retry"""

        def failing_func(**kwargs):
            raise ValueError("Bad input")

        mock_func = Mock(side_effect=failing_func)
        decorated = with_retry(max_retries=2)(mock_func)

        with pytest.raises(ValueError):
            decorated()

        assert mock_func.call_count == 1  # No retries

    def test_timeout_parameter_added_to_kwargs(self):
        """Decorator should add timeout to function kwargs"""
        mock_func = Mock(return_value="success")
        decorated = with_retry(max_retries=2, timeout=30.0)(mock_func)

        decorated()

        # Check that timeout was added to kwargs
        call_kwargs = mock_func.call_args[1]
        assert "timeout" in call_kwargs
        assert call_kwargs["timeout"] == 30.0

    def test_preserves_existing_timeout_in_kwargs(self):
        """Decorator should not override existing timeout in kwargs"""
        mock_func = Mock(return_value="success")
        decorated = with_retry(max_retries=2, timeout=30.0)(mock_func)

        # Call with explicit timeout
        decorated(timeout=60.0)

        # Should preserve the explicit timeout
        call_kwargs = mock_func.call_args[1]
        assert call_kwargs["timeout"] == 60.0

    def test_multiple_retries_with_different_errors(self):
        """Function can retry through multiple different error types"""
        request_mock = Mock()
        response_mock = Mock()
        response_mock.status_code = 429

        mock_func = Mock(
            side_effect=[
                APITimeoutError(request=request_mock),
                RateLimitError("Rate limited", response=response_mock, body=None),
                "success",
            ]
        )

        with patch("time.sleep"):
            decorated = with_retry(max_retries=2)(mock_func)
            result = decorated()

        assert result == "success"
        assert mock_func.call_count == 3

    def test_decorator_preserves_function_metadata(self):
        """Decorator should preserve original function name and docstring"""

        @with_retry(max_retries=2)
        def my_function():
            """My docstring"""
            return "result"

        assert my_function.__name__ == "my_function"
        assert my_function.__doc__ == "My docstring"
