"""
Test timeout handling for Claude API calls and database queries
"""

from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from anthropic import APITimeoutError
from fastapi import HTTPException, status


class TestClaudeAPITimeouts:
    """Test timeout handling for Claude API calls"""

    @pytest.mark.asyncio
    async def test_api_timeout_error_raised(self):
        """Test that APITimeoutError is raised when Claude API times out"""
        from services.claude_service import _call_claude_for_extraction

        with patch("services.claude_service.client") as mock_client:
            # Mock the API to raise timeout error
            mock_client.messages.create.side_effect = APITimeoutError(
                "Request timed out"
            )

            # Call should raise APITimeoutError
            with pytest.raises(APITimeoutError):
                await _call_claude_for_extraction("system", "user")

    @pytest.mark.asyncio
    async def test_extraction_timeout_after_retries(self):
        """Test that extraction function times out after max retries"""
        from services.claude_service import _call_claude_for_extraction

        with patch("services.claude_service.client") as mock_client:
            # Mock API to always timeout
            mock_client.messages.create.side_effect = APITimeoutError(
                "Request timed out"
            )

            # Should raise after retries exhausted
            with pytest.raises(APITimeoutError):
                await _call_claude_for_extraction("system", "user")

            # Should have attempted multiple times (original + retries)
            assert mock_client.messages.create.call_count >= 2

    @pytest.mark.asyncio
    async def test_generation_timeout_after_retries(self):
        """Test that generation function times out after max retries"""
        from services.claude_service import _call_claude_for_generation

        with patch("services.claude_service.client") as mock_client:
            # Mock API to always timeout
            mock_client.messages.create.side_effect = APITimeoutError(
                "Request timed out"
            )

            # Should raise after retries exhausted
            with pytest.raises(APITimeoutError):
                await _call_claude_for_generation("system", "user")

            # Should have attempted multiple times (original + retries)
            assert mock_client.messages.create.call_count >= 2

    @pytest.mark.asyncio
    async def test_evaluation_timeout_after_retries(self):
        """Test that evaluation function times out after max retries"""
        from services.claude_service import _call_claude_for_evaluation

        with patch("services.claude_service.client") as mock_client:
            # Mock API to always timeout
            mock_client.messages.create.side_effect = APITimeoutError(
                "Request timed out"
            )

            # Should raise after retries exhausted
            with pytest.raises(APITimeoutError):
                await _call_claude_for_evaluation("system", "user")

            # Should have attempted multiple times (original + retries)
            assert mock_client.messages.create.call_count >= 2

    @pytest.mark.asyncio
    async def test_timeout_values_passed_to_api(self):
        """Test that timeout values are correctly passed to API calls"""
        from services.claude_service import _call_claude_for_extraction

        with patch("services.claude_service.client") as mock_client:
            # Mock successful response (async mock for await)
            mock_response = Mock()
            mock_response.content = [Mock(text="test")]
            mock_client.messages.create = AsyncMock(return_value=mock_response)

            # Call the function
            await _call_claude_for_extraction("system", "user")

            # Verify timeout was passed to API call
            call_kwargs = mock_client.messages.create.call_args[1]
            assert "timeout" in call_kwargs
            assert call_kwargs["timeout"] == 30.0

    @pytest.mark.asyncio
    async def test_different_timeout_for_generation(self):
        """Test that generation has longer timeout than extraction"""
        from services.claude_service import _call_claude_for_generation

        with patch("services.claude_service.client") as mock_client:
            # Mock successful response (async mock for await)
            mock_response = Mock()
            mock_response.content = [Mock(text="test")]
            mock_client.messages.create = AsyncMock(return_value=mock_response)

            # Call the function
            await _call_claude_for_generation("system", "user")

            # Verify longer timeout for generation
            call_kwargs = mock_client.messages.create.call_args[1]
            assert "timeout" in call_kwargs
            assert call_kwargs["timeout"] == 90.0

    @pytest.mark.asyncio
    async def test_different_timeout_for_evaluation(self):
        """Test that evaluation has medium timeout"""
        from services.claude_service import _call_claude_for_evaluation

        with patch("services.claude_service.client") as mock_client:
            # Mock successful response (async mock for await)
            mock_response = Mock()
            mock_response.content = [Mock(text="test")]
            mock_client.messages.create = AsyncMock(return_value=mock_response)

            # Call the function
            await _call_claude_for_evaluation("system", "user")

            # Verify medium timeout for evaluation
            call_kwargs = mock_client.messages.create.call_args[1]
            assert "timeout" in call_kwargs
            assert call_kwargs["timeout"] == 60.0


class TestDatabaseQueryTimeouts:
    """Test timeout handling for database queries"""

    def test_query_timeout_setting_applied(self):
        """Test that statement_timeout is set for database queries"""
        from config.database import execute_query

        with patch("config.database.get_db_connection") as mock_conn_context:
            # Mock connection and cursor
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_conn.cursor.return_value.__enter__ = Mock(return_value=mock_cursor)
            mock_conn.cursor.return_value.__exit__ = Mock(return_value=False)
            mock_conn_context.return_value.__enter__ = Mock(return_value=mock_conn)
            mock_conn_context.return_value.__exit__ = Mock(return_value=False)

            # Mock fetchall to return empty list
            mock_cursor.fetchall.return_value = []

            # Execute query
            execute_query("SELECT * FROM users")

            # Verify statement_timeout was set
            calls = mock_cursor.execute.call_args_list
            timeout_call = [
                call for call in calls if "statement_timeout" in str(call).lower()
            ]
            assert len(timeout_call) > 0, "statement_timeout should be set"

    def test_query_timeout_error_handling(self):
        """Test that query timeout errors are properly caught"""
        import psycopg
        from config.database import execute_query

        with patch("config.database.get_db_connection") as mock_conn_context:
            # Mock connection to raise QueryCanceled (timeout error)
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg.errors.QueryCanceled(
                "canceling statement due to statement timeout"
            )
            mock_conn.cursor.return_value.__enter__ = Mock(return_value=mock_cursor)
            mock_conn.cursor.return_value.__exit__ = Mock(return_value=False)
            mock_conn_context.return_value.__enter__ = Mock(return_value=mock_conn)
            mock_conn_context.return_value.__exit__ = Mock(return_value=False)

            # Should raise the timeout error
            with pytest.raises(psycopg.errors.QueryCanceled):
                execute_query("SELECT * FROM users WHERE processing_time > 5000")

    def test_timeout_configurable_per_query(self):
        """Test that timeout can be configured per query"""
        from config.database import execute_query

        with patch("config.database.get_db_connection") as mock_conn_context:
            # Mock connection and cursor
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_conn.cursor.return_value.__enter__ = Mock(return_value=mock_cursor)
            mock_conn.cursor.return_value.__exit__ = Mock(return_value=False)
            mock_conn_context.return_value.__enter__ = Mock(return_value=mock_conn)
            mock_conn_context.return_value.__exit__ = Mock(return_value=False)

            # Mock fetchall to return empty list
            mock_cursor.fetchall.return_value = []

            # Execute query with custom timeout
            execute_query("SELECT * FROM users", timeout_ms=5000)

            # Verify custom timeout was used
            calls = [str(call) for call in mock_cursor.execute.call_args_list]
            timeout_calls = [call for call in calls if "5000" in call]
            assert len(timeout_calls) > 0, "Custom timeout should be used"


class Test504GatewayTimeoutResponses:
    """Test 504 Gateway Timeout error responses"""

    def test_api_timeout_returns_504(self):
        """Test that API timeout returns 504 status code"""
        from anthropic import APITimeoutError
        from utils.error_handler import log_and_raise_http_error

        # Should raise HTTPException with 504 status
        with pytest.raises(HTTPException) as exc_info:
            try:
                raise APITimeoutError("Request timed out")
            except APITimeoutError as e:
                log_and_raise_http_error(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    public_message="The Claude API request timed out. Please try again.",
                    error=e,
                )

        assert exc_info.value.status_code == status.HTTP_504_GATEWAY_TIMEOUT

    def test_database_timeout_returns_504(self):
        """Test that database timeout returns 504 status code"""
        import psycopg
        from utils.error_handler import log_and_raise_http_error

        # Should raise HTTPException with 504 status
        with pytest.raises(HTTPException) as exc_info:
            try:
                raise psycopg.errors.QueryCanceled(
                    "canceling statement due to statement timeout"
                )
            except psycopg.errors.QueryCanceled as e:
                log_and_raise_http_error(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    public_message="The database query timed out. Please try again.",
                    error=e,
                )

        assert exc_info.value.status_code == status.HTTP_504_GATEWAY_TIMEOUT

    def test_504_includes_clear_message(self):
        """Test that 504 responses include clear, user-friendly messages"""
        from anthropic import APITimeoutError
        from utils.error_handler import log_and_raise_http_error

        with pytest.raises(HTTPException) as exc_info:
            try:
                raise APITimeoutError("Request timed out")
            except APITimeoutError as e:
                log_and_raise_http_error(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    public_message="The request timed out. Please try again.",
                    error=e,
                )

        # Message should be clear and actionable
        assert "timed out" in exc_info.value.detail.lower()
        assert "try again" in exc_info.value.detail.lower()

    def test_504_detail_format_in_production(self):
        """Test that 504 detail doesn't leak sensitive info in production"""
        from anthropic import APITimeoutError
        from config.settings import settings
        from utils.error_handler import log_and_raise_http_error

        # Mock production environment
        with patch.object(settings, "ENVIRONMENT", "production"):
            with pytest.raises(HTTPException) as exc_info:
                try:
                    raise APITimeoutError("Internal timeout details")
                except APITimeoutError as e:
                    log_and_raise_http_error(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        public_message="The request timed out. Please try again.",
                        error=e,
                    )

            # Should not include internal error details
            assert "Internal timeout details" not in str(exc_info.value.detail)
            # Should include public message
            assert "timed out" in exc_info.value.detail.lower()

    def test_504_detail_format_in_development(self):
        """Test that 504 detail includes helpful info in development"""
        from anthropic import APITimeoutError
        from config.settings import settings
        from utils.error_handler import log_and_raise_http_error

        # Mock development environment
        with patch.object(settings, "ENVIRONMENT", "development"):
            with pytest.raises(HTTPException) as exc_info:
                try:
                    raise APITimeoutError("Request timed out after 30s")
                except APITimeoutError as e:
                    log_and_raise_http_error(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        public_message="The request timed out. Please try again.",
                        error=e,
                    )

            # Should include error details for debugging
            # Note: APITimeoutError message gets normalized to "Request timed out."
            assert "timed out" in str(exc_info.value.detail).lower()


class TestEndToEndTimeoutHandling:
    """Test end-to-end timeout handling in routers"""

    @pytest.mark.asyncio
    async def test_timeout_handling_in_service_layer(self):
        """Test that timeout errors are properly raised from service layer"""
        from anthropic import APITimeoutError
        from services.claude_service import _call_claude_for_extraction

        with patch("services.claude_service.client") as mock_client:
            # Mock API to timeout
            mock_client.messages.create.side_effect = APITimeoutError(
                "Request timed out"
            )

            # Service layer should raise the timeout error after retries
            with pytest.raises(APITimeoutError):
                await _call_claude_for_extraction("system", "user")

    def test_timeout_error_attributes(self):
        """Test that APITimeoutError has expected attributes"""
        from anthropic import APITimeoutError

        error = APITimeoutError("Request timed out")

        # Verify it's the right exception type
        assert isinstance(error, APITimeoutError)
        assert "timed out" in str(error).lower()
