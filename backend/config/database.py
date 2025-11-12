"""
Database Connection Utility
Handles PostgreSQL connections to Supabase database with connection pooling
"""

import logging
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

import psycopg
from config.settings import settings
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)


def convert_uuids_to_strings(data: Any) -> Any:
    """
    Recursively convert UUID objects to strings in data structures

    Args:
        data: Data that may contain UUID objects

    Returns:
        Data with UUIDs converted to strings
    """
    if isinstance(data, UUID):
        return str(data)
    elif isinstance(data, dict):
        return {key: convert_uuids_to_strings(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_uuids_to_strings(item) for item in data]
    return data


# Global connection pool (initialized on startup)
_pool: Optional[ConnectionPool] = None


def init_db_pool() -> None:
    """
    Initialize the database connection pool.
    Should be called during application startup.

    Raises:
        Exception: If pool initialization fails
    """
    global _pool

    if _pool is not None:
        logger.warning("Database pool already initialized")
        return

    try:
        logger.info(
            f"Initializing database pool (min={settings.DB_POOL_MIN_SIZE}, "
            f"max={settings.DB_POOL_MAX_SIZE})"
        )

        _pool = ConnectionPool(
            conninfo=settings.DATABASE_URL,
            min_size=settings.DB_POOL_MIN_SIZE,
            max_size=settings.DB_POOL_MAX_SIZE,
            timeout=settings.DB_POOL_TIMEOUT,
            max_lifetime=settings.DB_POOL_MAX_LIFETIME,
            max_idle=settings.DB_POOL_MAX_IDLE,
            # Configure connection on checkout
            configure=_configure_connection,
        )

        logger.info("Database pool initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}", exc_info=True)
        raise


def close_db_pool() -> None:
    """
    Close the database connection pool.
    Should be called during application shutdown.
    """
    global _pool

    if _pool is None:
        logger.warning("Database pool not initialized, nothing to close")
        return

    try:
        logger.info("Closing database pool...")
        _pool.close()
        _pool = None
        logger.info("Database pool closed successfully")

    except Exception as e:
        logger.error(f"Error closing database pool: {e}", exc_info=True)


def _configure_connection(conn: psycopg.Connection) -> None:
    """
    Configure connection when checked out from pool.

    Args:
        conn: Database connection to configure
    """
    # Set row factory to return dictionaries
    conn.row_factory = dict_row


def get_pool() -> ConnectionPool:
    """
    Get the database connection pool.

    Returns:
        ConnectionPool instance

    Raises:
        RuntimeError: If pool not initialized
    """
    if _pool is None:
        raise RuntimeError(
            "Database pool not initialized. Call init_db_pool() during startup."
        )
    return _pool


def get_pool_stats() -> Dict[str, Any]:
    """
    Get connection pool statistics for monitoring.

    Returns:
        Dictionary with pool statistics
    """
    if _pool is None:
        return {"status": "not_initialized"}

    stats = _pool.get_stats()
    return {
        "pool_size": stats.get("pool_size", 0),
        "pool_available": stats.get("pool_available", 0),
        "requests_waiting": stats.get("requests_waiting", 0),
        "usage_percent": (
            round(
                (
                    (stats.get("pool_size", 0) - stats.get("pool_available", 0))
                    / settings.DB_POOL_MAX_SIZE
                    * 100
                ),
                2,
            )
            if stats.get("pool_size", 0) > 0
            else 0
        ),
    }


@contextmanager
def get_db_connection():
    """
    Context manager for database connections from the pool.
    Automatically handles connection checkout/checkin and cleanup.

    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users")
                results = cursor.fetchall()

    Raises:
        RuntimeError: If pool not initialized
    """
    pool = get_pool()

    conn = None
    try:
        # Get connection from pool
        with pool.connection() as conn:
            yield conn
            # Connection automatically returned to pool after successful execution
            conn.commit()

    except Exception as e:
        # Rollback on error
        if conn is not None:
            conn.rollback()
        raise e
    # Connection automatically returned to pool via context manager


def execute_query(
    query: str,
    params: Optional[tuple] = None,
    fetch_one: bool = False,
    timeout_ms: int = 30000,
):
    """
    Execute a SQL query and return results

    Args:
        query: SQL query string
        params: Query parameters (optional)
        fetch_one: If True, fetch only one result; otherwise fetch all
        timeout_ms: Query timeout in milliseconds (default: 30000ms = 30s)

    Returns:
        Query results as dictionary or list of dictionaries (with UUIDs converted to strings)

    Raises:
        ValueError: If timeout_ms is not a positive integer
    """
    # Validate timeout_ms to prevent SQL injection
    if not isinstance(timeout_ms, int) or timeout_ms <= 0:
        raise ValueError("timeout_ms must be a positive integer")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            # Set statement timeout for this query (safe after validation)
            cursor.execute(f"SET LOCAL statement_timeout = {timeout_ms}")
            cursor.execute(query, params)

            # For INSERT/UPDATE/DELETE that return data
            if (
                query.strip().upper().startswith(("INSERT", "UPDATE", "DELETE"))
                and "RETURNING" in query.upper()
            ):
                result = cursor.fetchone() if fetch_one else cursor.fetchall()
                return convert_uuids_to_strings(result)

            # For SELECT queries
            if query.strip().upper().startswith("SELECT"):
                result = cursor.fetchone() if fetch_one else cursor.fetchall()
                return convert_uuids_to_strings(result)

            # For other queries (CREATE, DROP, etc.)
            return None


async def test_db_connection() -> bool:
    """
    Test database connection

    Returns:
        True if connection successful, False otherwise
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                return result is not None
    except Exception as e:
        print(f"Database connection error: {e}")
        return False


def get_user_by_email(email: str):
    """
    Get user by email address

    Args:
        email: User email address

    Returns:
        User record or None if not found
    """
    query = "SELECT * FROM users WHERE email = %s"
    return execute_query(query, (email,), fetch_one=True)


def create_user(email: str):
    """
    Create a new user

    Args:
        email: User email address

    Returns:
        Created user record
    """
    query = """
        INSERT INTO users (email)
        VALUES (%s)
        RETURNING *
    """
    return execute_query(query, (email,), fetch_one=True)


def get_or_create_user(email: str):
    """
    Get existing user or create new one

    Args:
        email: User email address

    Returns:
        User record
    """
    user = get_user_by_email(email)
    if not user:
        user = create_user(email)
    return user
