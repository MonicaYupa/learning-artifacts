# Learning Artifacts

A Claude-powered feature that promotes skill development through interactive, progressive exercises. Users input topics, receive Claude-generated learning modules, and build real expertise through active practice with AI feedback.

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
- PostgreSQL (Supabase) with Psycopg3 connection pooling
- Anthropic Claude API (Sonnet 4)
- JWT Authentication (RS256)
- Sentry (backend error tracking)

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
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐    │
│  │  Auth    │  │  Module  │  │  Session Management     │    │
│  │  (SSR)   │  │  Display │  │  (Hints, Submissions)   │    │
│  └──────────┘  └──────────┘  └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                    REST API (HTTP/JSON)
                            │
┌─────────────────────────────────────────────────────────────┐
│                        Backend                              │
│                    (FastAPI + Python)                       │
│                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  JWT Auth    │  │  Module     │  │  Answer          │    │
│  │  Middleware  │  │  Generator  │  │  Evaluator       │    │
│  └──────────────┘  └─────────────┘  └──────────────────┘    │
│                            │                                │
│                    Claude API Client                        │
└─────────────────────────────────────────────────────────────┘
                            │
                    PostgreSQL Connection
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                      │
│                                                             │
│        Users  │  Modules  │  Sessions  │  Attempts          │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
learning-artifacts/
├── frontend/              # Next.js application
│   ├── app/              # Next.js App Router pages
│   │   ├── auth/login/   # Login page
│   │   ├── auth/signup/  # Signup page
│   │   ├── module/       # Module list and chat interface
│   │   └── module/[id]/  # Individual module learning interface
│   ├── components/       # React components
│   │   ├── exercises/    # Exercise type components
│   │   └── module/       # Module-specific components
│   ├── contexts/         # ModuleContext for state management
│   ├── hooks/            # Custom hooks (navigation, progress, state)
│   ├── lib/              # API clients, Supabase, utilities
│   ├── types/            # TypeScript definitions
│   └── __tests__/        # Frontend tests
│
├── backend/              # FastAPI application
│   ├── config/           # Settings, database, constants, Sentry
│   ├── middleware/       # JWT auth, error context
│   ├── models/           # Pydantic schemas
│   ├── routers/          # API endpoints (health, modules, sessions)
│   ├── services/         # Claude integration, retry/timeout handling
│   ├── utils/            # Error handling, security
│   ├── migrations/       # SQL database migrations
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
# - CORS_ORIGINS (optional, defaults to localhost:3000)
# - SENTRY_DSN (optional, for error tracking)

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

- **AI Module Generation**: Claude generates customized learning modules from user natural language topics and skill levels
  - Chat-like interface with streaming generation
  - 3 exercises per module with estimated completion time
- **Progressive Exercises**: Three exercise types with increasing complexity
  - Analysis: Break down concepts and explain key components
  - Comparative Evaluation: Compare approaches and identify trade-offs
  - Structured Framework: Build comprehensive mental models
- **Interactive Hints**: Progressive 3-level hint system with on-demand generation
- **Streaming Feedback**: Real-time evaluation with specific guidance on submissions
- **Session Tracking**: Full progress persistence with localStorage backup
  - Multiple attempts per exercise
  - Confidence ratings and time tracking
- **Celebration UX**: Confetti animation on strong exercise submissions
- **Mobile Responsive**: Tab-based navigation optimized for all screen sizes

## API Endpoints

### Health

- `GET /health` - System health check
- `GET /ping` - Simple connectivity test

### Authentication

- Managed via Supabase Auth (JWT tokens)

### Modules

- `POST /api/modules/generate` - Generate new module from topic/skill level
- `POST /api/modules/generate/stream` - Generate module with streaming (SSE)
- `GET /api/modules` - List user's modules
- `GET /api/modules/{id}` - Get module details

### Sessions

- `POST /api/sessions` - Start new session
- `GET /api/sessions/{id}` - Get session state with attempt history
- `POST /api/sessions/{id}/submit` - Submit answer for evaluation
- `POST /api/sessions/{id}/submit/stream` - Submit with streaming feedback (SSE)
- `POST /api/sessions/{id}/hint` - Request progressive hint
- `PATCH /api/sessions/{id}` - Update session (exercise index, status, confidence)

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
