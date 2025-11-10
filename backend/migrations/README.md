# Database Migrations

This directory contains SQL migrations for the Learning Artifacts database schema.

## Database Schema

The schema consists of three main tables:

1. **users** - User account information
2. **modules** - AI-generated learning modules with exercises
3. **sessions** - User progress tracking through modules

## How to Apply Migrations

### Option 1: Run All Migrations at Once (Recommended for Initial Setup)

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Copy the contents of `000_run_all_migrations.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute
6. Verify the tables were created by checking the output

### Option 2: Run Migrations Individually

Run the migrations in order:

1. `001_create_users_table.sql`
2. `002_create_modules_table.sql`
3. `003_create_sessions_table.sql`

For each file:
1. Copy the SQL content
2. Paste into Supabase SQL Editor
3. Click "Run"

## Verification

After running migrations, verify the schema with this query:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'modules', 'sessions');

-- Check all indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'modules', 'sessions')
ORDER BY tablename, indexname;

-- Check foreign key constraints
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
AND tc.table_name IN ('users', 'modules', 'sessions');
```

## Schema Details

### Users Table
- Stores user account information
- Links to Supabase Auth via email
- Cascading deletes ensure data integrity

### Modules Table
- Stores AI-generated learning modules
- `exercises` column uses JSONB for flexible exercise storage
- Supports three exercise types: analysis, comparative, framework
- Indexed for efficient queries by domain and skill level

### Sessions Table
- Tracks user progress through modules
- `attempts` column stores attempt history in JSONB format
- Foreign keys to users and modules with CASCADE delete
- Check constraints ensure data integrity (status values, confidence rating range)
- Indexed for efficient queries by user, module, and status

## Rollback (if needed)

To remove all tables:

```sql
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

**Warning:** This will delete all data. Use with caution.
