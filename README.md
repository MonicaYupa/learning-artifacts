# Learning Artifacts

An AI-powered learning mode that promotes skill development through interactive, progressive exercises. Users input topics, receive Claude-generated modules, and build real expertise through active practice with AI feedback.

## Problem Statement

When AI agents handle complex tasks autonomously, humans can become passive observers rather than active learners, missing opportunities to develop their own skills and understanding.

## Solution

A dedicated learning mode with interactive, artifact-style learning modules requiring progressive knowledge application. Prioritizes understanding over output through active construction, retrieval practice, immediate feedback, and metacognitive reflection.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS (deployed on Vercel)
- **Backend:** FastAPI, Python (deployed on Railway)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase JWT-based authentication
- **AI:** Claude API for module generation and answer evaluation

## Architecture

```
Frontend (Next.js + TypeScript + Tailwind)
    ↓ REST API
Backend (FastAPI + Python)
    ↓ Postgres
Database (Supabase)
```

## Key Features

- AI-generated learning modules with progressive difficulty
- Split-screen artifact presentation (chat + text editor)
- Three exercise types: Analysis, Comparative Evaluation, Structured Framework
- Progressive hint disclosure system
- Immediate, specific feedback on submissions
- Lightweight progress tracking and confidence ratings

## Development Roadmap

### Phase 1: Database & Auth Foundation
Set up Supabase database schema (Users, Modules, Sessions) and implement JWT authentication in FastAPI.

### Phase 2: Backend API Skeleton
Build core API endpoints for module generation, retrieval, and storage using Claude API integration.

### Phase 3: Session Management
Implement session lifecycle, answer evaluation, progressive hints, and attempt tracking.

### Phase 4: Frontend Foundation
Set up Next.js project with Supabase auth and entry screen for topic/skill selection.

### Phase 5: Split-Screen Interface
Build the main learning interface with chat panel and text editor.

### Phase 6: Interactive Features
Implement hint system, answer submission, feedback states, and auto-advance logic.

### Phase 7: Completion Experience
Create completion screen with celebration, confidence rating, and progress visualization.

### Phase 8: Error Handling & Polish
Add comprehensive error handling, loading states, and retry logic.

### Phase 9: Validation
End-to-end testing, performance validation, and success metrics verification.

## Getting Started

Documentation for local setup will be added as the project develops.

## Project Structure

```
learning-artifacts/
├── backend/           # FastAPI backend
│   ├── routers/      # API endpoints
│   ├── models/       # Pydantic models
│   ├── middleware/   # JWT auth middleware
│   └── config/       # Configuration
├── frontend/         # Next.js frontend
│   ├── app/         # App router pages
│   ├── components/  # React components
│   └── lib/         # Utilities
└── migrations/      # Database migrations
```

## License

MIT
