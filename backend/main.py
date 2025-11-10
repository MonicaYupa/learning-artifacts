"""
Learning Artifacts Backend API
FastAPI application for AI-powered learning modules
"""

from contextlib import asynccontextmanager

from config.database import test_db_connection
from config.settings import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle startup and shutdown events
    """
    # Startup
    print("Starting Learning Artifacts API...")
    print(f"Environment: {settings.ENVIRONMENT}")

    # Test database connection
    if await test_db_connection():
        print("✓ Database connection successful")
    else:
        print("✗ Database connection failed")

    yield

    # Shutdown
    print("Shutting down Learning Artifacts API...")


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

# Include routers
app.include_router(health.router, tags=["health"])


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
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
