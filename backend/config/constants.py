"""
Application Constants
Centralized configuration values to avoid magic numbers scattered across the codebase
"""


class ExerciseConstants:
    """Constants related to exercise management and user interactions"""

    # Maximum number of hints available per exercise
    MAX_HINTS = 3

    # Minimum length for answer text validation
    MIN_ANSWER_LENGTH = 10

    # Maximum length for answer text validation
    MAX_ANSWER_LENGTH = 10000


class ClaudeConstants:
    """Constants for Claude API configuration"""

    # Model identifier for Claude API calls
    MODEL = "claude-sonnet-4-20250514"

    # Token limits for different API operations
    EXTRACTION_MAX_TOKENS = 500  # For topic and level extraction
    GENERATION_MAX_TOKENS = 8000  # For module generation
    EVALUATION_MAX_TOKENS = 1000  # For answer evaluation

    # Timeout settings (in seconds) for different API operations
    EXTRACTION_TIMEOUT = 30.0  # Topic extraction is quick
    GENERATION_TIMEOUT = 90.0  # Module generation needs more time
    EVALUATION_TIMEOUT = 60.0  # Answer evaluation is moderate

    # Temperature settings for different operations
    EXTRACTION_TEMPERATURE = 0.3  # Low temp for consistent extraction
    GENERATION_TEMPERATURE = 0.7  # Higher temp for creative module generation
    EVALUATION_TEMPERATURE = 0.5  # Medium temp for balanced evaluation


class RetryConstants:
    """Constants for retry logic and error handling"""

    # HTTP status codes that should trigger automatic retries
    RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

    # Maximum number of retry attempts for API calls
    MAX_RETRIES = 2

    # Base delay for exponential backoff (in seconds)
    BASE_DELAY = 1.0

    # Maximum delay between retries (in seconds)
    MAX_DELAY = 60.0
