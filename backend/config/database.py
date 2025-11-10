"""
Database Connection Utility
Handles PostgreSQL connections to Supabase database
"""

import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager
from typing import Optional

from config.settings import settings


@contextmanager
def get_db_connection():
    """
    Context manager for database connections
    Automatically handles connection cleanup

    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users")
                results = cursor.fetchall()
    """
    conn = None
    try:
        conn = psycopg.connect(
            settings.DATABASE_URL,
            row_factory=dict_row  # Return rows as dictionaries
        )
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()


def execute_query(query: str, params: Optional[tuple] = None, fetch_one: bool = False):
    """
    Execute a SQL query and return results

    Args:
        query: SQL query string
        params: Query parameters (optional)
        fetch_one: If True, fetch only one result; otherwise fetch all

    Returns:
        Query results as dictionary or list of dictionaries
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)

            # For INSERT/UPDATE/DELETE that return data
            if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) and 'RETURNING' in query.upper():
                if fetch_one:
                    return cursor.fetchone()
                return cursor.fetchall()

            # For SELECT queries
            if query.strip().upper().startswith('SELECT'):
                if fetch_one:
                    return cursor.fetchone()
                return cursor.fetchall()

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
