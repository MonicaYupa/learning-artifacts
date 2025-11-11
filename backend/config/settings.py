"""
Application Settings
Loads configuration from environment variables
"""

from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """

    # Environment
    ENVIRONMENT: str = "development"

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str
    JWT_SECRET: str  # JWT secret for HS256 token verification

    # JWT Configuration (using JWT signing keys)
    JWT_ALGORITHM: str = "ES256"  # Supabase uses ES256 with signing keys

    # Claude API Configuration
    ANTHROPIC_API_KEY: str
    USE_MOCK_CLAUDE: bool = False  # Set to True to use mock data instead of Claude API

    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # API Configuration
    API_PREFIX: str = "/api"

    # Sentry Configuration
    SENTRY_DSN: str = ""  # Optional: Leave empty to disable Sentry
    RELEASE_VERSION: str = "1.0.0"  # Optional: Release version for Sentry tracking

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


# Create settings instance
settings = Settings()
