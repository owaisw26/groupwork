# GroupWork

University group assignment accountability platform. Students plan tasks, log work, verify contributions, resolve disputes, and generate auditable contribution reports.

## Tech Stack

- **Backend**: FastAPI, Python 3.12, PostgreSQL, psycopg2
- **Frontend**: React 18, Vite, Material UI, Redux Toolkit
- **Infrastructure**: Docker Compose (local); production on [Vercel](https://groupwork-rho.vercel.app) (frontend), [Render](https://groupwork-dr2n.onrender.com) (API), [Neon](https://neon.tech) (Postgres)

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ (local dev via Homebrew or Docker)
- Docker & Docker Compose (optional, for containerized local dev)

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set environment variables (copy from .env.example)
export DATABASE_URL=postgresql://localhost:5432/groupwork

uvicorn app.main:create_app --factory --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose

```bash
docker compose up --build
```

- Backend API: http://localhost:8000
- Frontend: http://localhost:5173
- Health check: http://localhost:8000/api/v1/health

## Testing

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

## Project Structure

```
groupwork/
  backend/          # FastAPI application
  frontend/         # React SPA
  docs/             # PRD and implementation plan
  .github/          # CI/CD workflows
```

## Production

Live app: https://groupwork-rho.vercel.app

See [Deployment Guide](docs/DEPLOY.md) for env vars, smoke tests, and troubleshooting.

## Documentation

- [Product Requirements Document](docs/groupwork_prd.md)
- [Implementation Plan](docs/groupwork_implementation_plan.md)
- [Deployment Guide](docs/DEPLOY.md)
