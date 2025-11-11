"""
Sentry Configuration
Initialize and configure Sentry for error tracking and performance monitoring
"""

import sentry_sdk


def init_sentry():
    """
    Initialize Sentry with environment-based configuration

    Features:
    - Environment-based DSN configuration
    - Error sampling and performance monitoring
    - FastAPI integration (automatically enabled)
    - Custom release tracking
    - Graceful error handling if initialization fails
    """
    try:
        # Import settings here to ensure .env is loaded
        from config.settings import settings

        sentry_dsn = settings.SENTRY_DSN

        # Only initialize if DSN is provided
        if not sentry_dsn:
            print("Sentry DSN not configured - error tracking disabled")
            return

        environment = settings.ENVIRONMENT
        release = settings.RELEASE_VERSION

        # Configure sampling rates based on environment
        if environment == "production":
            traces_sample_rate = 0.2  # 20% of transactions in production
            profiles_sample_rate = 0.2  # 20% profile sampling in production
        elif environment == "staging":
            traces_sample_rate = 0.5  # 50% in staging
            profiles_sample_rate = 0.5
        else:  # development
            traces_sample_rate = 1.0  # 100% in development
            profiles_sample_rate = 1.0

        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            release=release,
            traces_sample_rate=traces_sample_rate,
            profiles_sample_rate=profiles_sample_rate,
            # FastAPI integration is automatically enabled when fastapi is installed
            send_default_pii=False,  # Don't send PII for privacy
            attach_stacktrace=True,
            max_breadcrumbs=50,
            debug=environment == "development",
        )

        print(f"✓ Sentry initialized for {environment} environment")
    except Exception as e:
        # Log the error but allow the app to continue without Sentry
        print(f"⚠ Sentry initialization failed: {e}")
        print("  Application will continue without error tracking")
