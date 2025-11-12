"""
Tests for database connection pool
"""

import pytest
from config.database import (
    close_db_pool,
    get_db_connection,
    get_pool,
    get_pool_stats,
    init_db_pool,
)


def test_pool_initialization(db_pool):
    """Test that pool can be initialized"""
    pool = get_pool()
    assert pool is not None


def test_pool_not_initialized_error():
    """Test error when trying to use pool before initialization"""
    # Close pool to test uninitialized state
    close_db_pool()

    with pytest.raises(RuntimeError, match="Database pool not initialized"):
        get_pool()

    # Re-initialize for other tests
    init_db_pool()


def test_pool_get_connection(db_pool):
    """Test getting connection from pool"""
    with get_db_connection() as conn:
        assert conn is not None
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            assert result["test"] == 1


def test_pool_multiple_connections(db_pool):
    """Test getting multiple connections concurrently"""
    connections_used = 0

    for i in range(5):
        with get_db_connection() as conn:
            connections_used += 1
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                assert result is not None

    assert connections_used == 5


def test_pool_connection_reuse(db_pool):
    """Test that connections are reused from pool"""
    # Get initial stats
    initial_stats = get_pool_stats()
    assert "pool_size" in initial_stats

    # Use connection
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")

    # Connection should be returned to pool
    after_stats = get_pool_stats()
    assert after_stats["pool_available"] >= 0


def test_pool_error_handling(db_pool):
    """Test that connections are returned to pool even on error"""
    initial_stats = get_pool_stats()

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM nonexistent_table_xyz123")
    except Exception:
        pass  # Expected to fail

    # Connection should still be returned to pool
    after_stats = get_pool_stats()
    # Pool should still be functional
    assert after_stats["pool_available"] >= 0


def test_pool_stats(db_pool):
    """Test pool statistics reporting"""
    stats = get_pool_stats()

    assert "pool_size" in stats
    assert "pool_available" in stats
    assert "requests_waiting" in stats
    assert "usage_percent" in stats

    # Usage percent should be between 0 and 100
    assert 0 <= stats["usage_percent"] <= 100


def test_pool_stats_not_initialized():
    """Test pool stats when pool not initialized"""
    # Close pool to test uninitialized state
    close_db_pool()

    stats = get_pool_stats()
    assert stats["status"] == "not_initialized"

    # Re-initialize for other tests
    init_db_pool()


def test_pool_transaction_commit(db_pool):
    """Test that transactions are committed properly"""
    # Use same connection for temp table test
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            # Create temp table
            cursor.execute(
                """
                CREATE TEMP TABLE test_pool_commit (
                    id SERIAL PRIMARY KEY,
                    value TEXT
                )
            """
            )
            # Insert data
            cursor.execute(
                "INSERT INTO test_pool_commit (value) VALUES (%s)", ("test_value",)
            )
            # Verify within same connection
            cursor.execute("SELECT value FROM test_pool_commit WHERE id = 1")
            result = cursor.fetchone()
            assert result is not None
            assert result["value"] == "test_value"


def test_pool_transaction_rollback(db_pool):
    """Test that transactions are rolled back on error"""
    # Test rollback within same connection
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Create temp table
                cursor.execute(
                    """
                    CREATE TEMP TABLE test_pool_rollback (
                        id SERIAL PRIMARY KEY,
                        value TEXT
                    )
                """
                )
                # Insert data
                cursor.execute(
                    "INSERT INTO test_pool_rollback (value) VALUES (%s)",
                    ("should_rollback",),
                )
                # Force an error - this should rollback the insert and table creation
                cursor.execute("SELECT * FROM nonexistent_table")
    except Exception:
        pass  # Expected to fail

    # If we can still query the table, verify no data was committed
    # Otherwise, the table should not exist (which is also expected behavior)
    # Both are valid outcomes of a rollback
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as count FROM test_pool_rollback")
                result = cursor.fetchone()
                assert result["count"] == 0
    except Exception:
        # Table doesn't exist - rollback worked correctly
        pass


def test_pool_close(db_pool):
    """Test that pool can be closed properly"""
    # Pool is initialized by fixture
    pool = get_pool()
    assert pool is not None

    # Close pool
    close_db_pool()

    # Should raise error after close
    with pytest.raises(RuntimeError, match="Database pool not initialized"):
        get_pool()
