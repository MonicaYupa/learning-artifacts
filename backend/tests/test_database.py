"""
Database Tests
Tests for database connection and schema
"""

import pytest
from config.database import execute_query, get_db_connection, test_db_connection


@pytest.mark.asyncio
async def test_database_connection():
    """Test that we can connect to the database"""
    result = await test_db_connection()
    assert result is True, "Database connection failed"


def test_users_table_exists():
    """Test that the users table exists with correct schema"""
    query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
    """
    columns = execute_query(query)

    assert len(columns) > 0, "Users table does not exist"

    column_names = [col["column_name"] for col in columns]
    assert "id" in column_names, "Users table missing 'id' column"
    assert "email" in column_names, "Users table missing 'email' column"
    assert "created_at" in column_names, "Users table missing 'created_at' column"


def test_modules_table_exists():
    """Test that the modules table exists with correct schema"""
    query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'modules'
        ORDER BY ordinal_position
    """
    columns = execute_query(query)

    assert len(columns) > 0, "Modules table does not exist"

    column_names = [col["column_name"] for col in columns]
    assert "id" in column_names, "Modules table missing 'id' column"
    assert "title" in column_names, "Modules table missing 'title' column"
    assert "domain" in column_names, "Modules table missing 'domain' column"
    assert "skill_level" in column_names, "Modules table missing 'skill_level' column"
    assert "exercises" in column_names, "Modules table missing 'exercises' column"


def test_sessions_table_exists():
    """Test that the sessions table exists with correct schema"""
    query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
    """
    columns = execute_query(query)

    assert len(columns) > 0, "Sessions table does not exist"

    column_names = [col["column_name"] for col in columns]
    assert "id" in column_names, "Sessions table missing 'id' column"
    assert "user_id" in column_names, "Sessions table missing 'user_id' column"
    assert "module_id" in column_names, "Sessions table missing 'module_id' column"
    assert (
        "current_exercise_index" in column_names
    ), "Sessions table missing 'current_exercise_index' column"
    assert "attempts" in column_names, "Sessions table missing 'attempts' column"
    assert "status" in column_names, "Sessions table missing 'status' column"


def test_foreign_key_constraints():
    """Test that foreign key constraints are properly set up"""
    query = """
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'sessions'
    """
    constraints = execute_query(query)

    assert (
        len(constraints) >= 2
    ), "Sessions table should have at least 2 foreign key constraints"

    # Check for user_id foreign key
    user_fk = [c for c in constraints if c["column_name"] == "user_id"]
    assert len(user_fk) > 0, "Missing foreign key constraint on user_id"
    assert (
        user_fk[0]["foreign_table_name"] == "users"
    ), "user_id should reference users table"

    # Check for module_id foreign key
    module_fk = [c for c in constraints if c["column_name"] == "module_id"]
    assert len(module_fk) > 0, "Missing foreign key constraint on module_id"
    assert (
        module_fk[0]["foreign_table_name"] == "modules"
    ), "module_id should reference modules table"


def test_indexes_exist():
    """Test that performance indexes are created"""
    query = """
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'modules', 'sessions')
        ORDER BY tablename, indexname
    """
    indexes = execute_query(query)

    assert len(indexes) > 0, "No indexes found on tables"

    # Check for some key indexes
    index_names = [idx["indexname"] for idx in indexes]
    assert "idx_users_email" in index_names, "Missing index on users.email"
    assert "idx_sessions_user_id" in index_names, "Missing index on sessions.user_id"
    assert (
        "idx_sessions_module_id" in index_names
    ), "Missing index on sessions.module_id"
