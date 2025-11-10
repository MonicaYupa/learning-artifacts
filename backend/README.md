# Learning Artifacts Backend

FastAPI backend for the Learning Artifacts application.

## Prerequisites

- Python 3.9+
- Supabase account and project
- Claude API key (Anthropic)

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your credentials
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)
- `DATABASE_URL` - PostgreSQL connection string from Supabase
- `ANTHROPIC_API_KEY` - Your Claude API key

**Note:** JWT secret is no longer required. The backend automatically fetches public keys from Supabase's JWKS endpoint for JWT verification using RS256 algorithm.

### 4. Set Up Database

1. Go to your Supabase project
2. Open the SQL Editor
3. Copy the contents of `migrations/000_run_all_migrations.sql`
4. Paste and execute in the SQL Editor
5. Verify tables were created successfully

See `migrations/README.md` for detailed instructions.

### 5. Run the Application

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## Project Structure

```
backend/
├── config/              # Configuration and database utilities
│   ├── settings.py     # Environment settings
│   └── database.py     # Database connection utilities
├── middleware/          # Authentication middleware
│   └── auth.py         # JWT verification
├── models/             # Pydantic models
│   └── schemas.py      # Request/response schemas
├── routers/            # API route handlers
│   └── health.py       # Health check endpoints
├── migrations/         # Database migrations
│   └── *.sql          # SQL migration files
├── tests/             # Test files
├── main.py            # FastAPI application entry point
├── requirements.txt   # Python dependencies
└── .env.example       # Example environment variables
```

## API Endpoints

### Health Check
- `GET /health` - Check API and database health
- `GET /ping` - Simple ping endpoint

### Future Endpoints (Phase 2-3)
- `POST /api/modules/generate` - Generate new learning module
- `GET /api/modules` - List all modules
- `GET /api/modules/{id}` - Get specific module
- `POST /api/sessions` - Create new session
- `GET /api/sessions/{id}` - Get session state
- `PATCH /api/sessions/{id}` - Update session
- `POST /api/sessions/{id}/submit` - Submit answer
- `POST /api/sessions/{id}/hint` - Request hint

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_health.py
```

## Development

### Adding New Endpoints

1. Create router in `routers/` directory
2. Define Pydantic models in `models/schemas.py`
3. Import and include router in `main.py`
4. Add tests in `tests/` directory

### Database Queries

Use the database utilities in `config/database.py`:

```python
from config.database import execute_query

# Execute query
results = execute_query("SELECT * FROM users WHERE email = %s", (email,))

# Use context manager for transactions
from config.database import get_db_connection

with get_db_connection() as conn:
    with conn.cursor() as cursor:
        cursor.execute("INSERT INTO users (email) VALUES (%s)", (email,))
```

### Authentication

Protected endpoints use the `get_current_user` dependency:

```python
from fastapi import Depends
from middleware.auth import get_current_user

@router.get("/protected")
async def protected_endpoint(user: dict = Depends(get_current_user)):
    return {"user_id": user["id"]}
```

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is correct in `.env`
2. Check Supabase project is running
3. Ensure your IP is not blocked by Supabase firewall
4. Test connection: `GET /health`

### JWT Verification Issues

1. Verify JWKS endpoint is accessible: `{SUPABASE_URL}/.well-known/jwks.json`
2. Check token is not expired
3. Ensure token is sent in `Authorization: Bearer <token>` header
4. Verify JWT signing keys are enabled in Supabase (Settings → API → JWT Settings)

### Module Generation Issues

1. Verify `ANTHROPIC_API_KEY` is valid
2. Check Claude API rate limits
3. Monitor API usage in Anthropic console

## Deployment

See main project README for deployment instructions to Railway.

## License

MIT
