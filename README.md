# Learning Artifacts

An AI-powered learning platform that promotes skill development through interactive, progressive exercises. Users input topics, receive Claude-generated modules, and build real expertise through active practice with AI feedback.

## Purpose

Traditional AI interactions can make users passive observers. This platform creates an active learning experience where:
- Users engage with AI-generated educational content through hands-on exercises
- Progressive difficulty builds real competency
- Immediate feedback reinforces learning
- Multiple exercise types (Analysis, Comparative Evaluation, Structured Framework) promote deep understanding

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- React 19
- Tailwind CSS 4
- Supabase Auth (SSR)

**Backend**
- FastAPI
- Python 3.9+
- PostgreSQL (Supabase)
- Anthropic Claude API
- JWT Authentication (RS256)

**DevOps**
- Frontend: Vercel
- Backend: Railway
- Database: Supabase

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                  (Next.js + TypeScript)                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐  │
│  │  Auth    │  │  Module  │  │  Session Management     │  │
│  │  (SSR)   │  │  Display │  │  (Hints, Submissions)   │  │
│  └──────────┘  └──────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    REST API (HTTP/JSON)
                            │
┌─────────────────────────────────────────────────────────────┐
│                        Backend                              │
│                    (FastAPI + Python)                       │
│                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  JWT Auth    │  │  Module     │  │  Answer          │  │
│  │  Middleware  │  │  Generator  │  │  Evaluator       │  │
│  └──────────────┘  └─────────────┘  └──────────────────┘  │
│                            │                                │
│                    Claude API Client                        │
└─────────────────────────────────────────────────────────────┘
                            │
                    PostgreSQL Connection
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                      │
│                                                             │
│        Users  │  Modules  │  Sessions  │  Attempts         │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
learning-artifacts/
├── frontend/              # Next.js application
│   ├── app/              # Next.js App Router pages
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Main dashboard
│   │   └── learning/     # Learning session interface
│   ├── components/       # Reusable React components
│   ├── contexts/         # React contexts (auth, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API clients
│   └── types/            # TypeScript definitions
│
├── backend/              # FastAPI application
│   ├── config/           # Settings and database utilities
│   ├── middleware/       # JWT authentication
│   ├── models/           # Pydantic schemas
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic (Claude integration)
│   ├── utils/            # Helper functions
│   ├── migrations/       # Database migrations
│   └── tests/            # Backend tests
│
└── package.json          # Root package for tooling (Prettier, Husky)
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL (via Supabase)
- Anthropic API key

### 1. Clone Repository

```bash
git clone <repository-url>
cd learning-artifacts
```

### 2. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the migrations in Supabase SQL Editor:
   ```bash
   cat backend/migrations/000_run_all_migrations.sql
   # Copy output and run in Supabase SQL Editor
   ```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL
# - ANTHROPIC_API_KEY

# Run development server
python main.py
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_API_URL (http://localhost:8000)

# Run development server
npm run dev
# Application available at http://localhost:3000
```

### 5. Development Tools

```bash
# Root directory - install pre-commit hooks
npm install
npm run prepare

# Frontend - run tests
cd frontend
npm test

# Backend - run tests
cd backend
pytest
```

## Key Features

- **AI Module Generation**: Claude generates customized learning modules based on user-specified topics
- **Progressive Exercises**: Three exercise types with increasing complexity
  - Analysis: Break down concepts and explain key components
  - Comparative Evaluation: Compare approaches and identify trade-offs
  - Structured Framework: Build comprehensive mental models
- **Interactive Hints**: Progressive hint system that reveals support incrementally
- **Immediate Feedback**: Real-time evaluation and specific guidance on submissions
- **Session Tracking**: Monitor progress, attempts, and confidence ratings

## API Endpoints

### Health
- `GET /health` - System health check
- `GET /ping` - Simple connectivity test

### Authentication
- Managed via Supabase Auth (JWT tokens)

### Modules
- `POST /api/modules/generate` - Generate new module
- `GET /api/modules` - List user's modules
- `GET /api/modules/{id}` - Get module details

### Sessions
- `POST /api/sessions` - Start new session
- `GET /api/sessions/{id}` - Get session state
- `POST /api/sessions/{id}/submit` - Submit answer
- `POST /api/sessions/{id}/hint` - Request hint
- `PATCH /api/sessions/{id}` - Update session

## Development

### Code Quality

```bash
# Frontend
npm run format        # Auto-format with Prettier
npm run format:check  # Check formatting
npm run lint          # ESLint

# Backend
black .               # Auto-format Python
isort .               # Sort imports
pytest                # Run tests
```

### Pre-commit Hooks

The project uses Husky and lint-staged to automatically format frontend code before commits.

## License

MIT
