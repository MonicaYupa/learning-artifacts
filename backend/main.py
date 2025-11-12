"""
Learning Artifacts Backend API
FastAPI application for AI-powered learning modules
"""

from contextlib import asynccontextmanager

from config.database import close_db_pool, init_db_pool, test_db_connection
from config.sentry import init_sentry
from config.settings import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.sentry_context import SentryContextMiddleware
from routers import health, modules, sessions

# Initialize Sentry before creating the app
init_sentry()


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle startup and shutdown events
    """
    # Startup
    print("Starting Learning Artifacts API...")
    print(f"Environment: {settings.ENVIRONMENT}")

    # Initialize database connection pool
    try:
        init_db_pool()
        print("✓ Database connection pool initialized")
    except Exception as e:
        print(f"✗ Failed to initialize database pool: {e}")
        raise  # Prevent startup if DB pool fails

    # Test database connection
    if await test_db_connection():
        print("✓ Database connection successful")
    else:
        print("✗ Database connection failed")
        # Close pool since DB is not reachable
        close_db_pool()
        raise RuntimeError("Database connection failed")

    yield

    # Shutdown
    print("Shutting down Learning Artifacts API...")

    # Close database connection pool
    close_db_pool()
    print("✓ Database connection pool closed")


# Create FastAPI application
app = FastAPI(
    title="Learning Artifacts API",
    description="AI-powered learning mode with interactive, progressive exercises",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Sentry context middleware
app.add_middleware(SentryContextMiddleware)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(modules.router, prefix=settings.API_PREFIX, tags=["modules"])
app.include_router(sessions.router, prefix=settings.API_PREFIX, tags=["sessions"])


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        "name": "Learning Artifacts API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.environ.get("PORT", 8000))  # fallback to 8000 locally
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
