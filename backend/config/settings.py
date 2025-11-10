"""
Application Settings
Loads configuration from environment variables
"""

from pydantic_settings import BaseSettings
from typing import List


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

    # JWT Configuration
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"

    # Claude API Configuration
    ANTHROPIC_API_KEY: str

    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # API Configuration
    API_PREFIX: str = "/api"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()
