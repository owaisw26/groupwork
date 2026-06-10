# Production Deployment (Free Tier)

FairShare production runs on managed free-tier services. The browser talks only to the Vercel frontend; API requests are proxied to Render so HttpOnly cookie auth stays same-origin.

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Vercel | https://groupwork-rho.vercel.app |
| Backend API | Render | https://groupwork-dr2n.onrender.com |
| Database | Neon Postgres 16 | (connection string in Render env) |
| Evidence files | Cloudflare R2 *(deferred)* | Not configured — uploads fail in production until P5.2 |
| Email (optional) | Resend / stdout | Verification links logged to Render logs when unset |

## Architecture

```
Browser → Vercel (SPA + /api rewrite) → Render (FastAPI) → Neon Postgres
```

`frontend/vercel.json` rewrites `/api/*` to the Render service. The frontend axios client uses `baseURL: '/api/v1'` with `withCredentials: true`, so no `VITE_API_URL` is required on Vercel.

## Prerequisites

- GitHub repo connected to **Vercel** (root directory: `frontend`) and **Render** (Docker, `backend/Dockerfile`)
- Neon project with pooled `DATABASE_URL`
- Production secrets set in each platform UI — never committed to the repo

## Render (backend)

- **Service type:** Web Service (free tier)
- **Build:** Docker — Dockerfile path `backend/Dockerfile`, context `backend`
- **Start command:** `uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT`
  - Migrations: run `python -m app.db.migrate` manually once (or via one-off job). The combined `migrate && uvicorn` command can exit early on some Render setups after migrations complete.
- **Health check path:** `/api/v1/health`

### Required environment variables

```bash
DATABASE_URL=<neon-pooled-connection-string>
JWT_SECRET=<32+ random characters>
ENVIRONMENT=production
COOKIE_SECURE=true
FRONTEND_URL=https://groupwork-rho.vercel.app
CORS_ORIGINS=https://groupwork-rho.vercel.app
REQUIRE_EMAIL_VERIFICATION=false
```

### Optional

```bash
AWS_S3_BUCKET=placeholder          # evidence upload disabled until R2/S3 is configured
RESEND_API_KEY=re_...              # email via Resend; stdout fallback when unset
EMAIL_FROM=FairShare <hello@your-domain.edu>
SES_SENDER_EMAIL=                  # legacy SES fallback if not using Resend
```

Set `REQUIRE_EMAIL_VERIFICATION=true` only after production email delivery is configured.

For Resend, create an API key in the Resend dashboard, verify a sender domain or email, then set
`RESEND_API_KEY` and `EMAIL_FROM` on Render. Restart/redeploy the backend after saving env vars.

## Vercel (frontend)

- **Root directory:** `frontend`
- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** none required (API proxied via `vercel.json`)
- **Auto-deploy:** push to `main`

## Neon (database)

1. Create a Postgres 16 project on [Neon](https://neon.tech).
2. Copy the **pooled** connection string (`?sslmode=require`).
3. Set as `DATABASE_URL` on Render.
4. Run migrations against production once:

```bash
DATABASE_URL='<neon-url>' python -m app.db.migrate
```

## Smoke tests

After deploy, verify connectivity (Render free tier may cold-start ~30s on first request):

```bash
# Direct backend health
curl -s https://groupwork-dr2n.onrender.com/api/v1/health
# Expected: {"status":"ok"}

# Proxied through Vercel (requires vercel.json merged and redeployed)
curl -s https://groupwork-rho.vercel.app/api/v1/health
# Expected: {"status":"ok"}
```

### Manual checklist

1. Open https://groupwork-rho.vercel.app — login page loads, no console CORS errors.
2. Register a new account — check Render logs for verification link (if email not configured).
3. Verify email → log in → create a project → add a task.
4. Evidence upload: **expected to fail** until Cloudflare R2 (P5.2) is configured.

## Cold starts

Render free tier spins down after inactivity. The first request after idle can take ~30 seconds. Retry or wait; subsequent requests are fast.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| CORS error in browser | `CORS_ORIGINS` on Render must match `https://groupwork-rho.vercel.app` exactly |
| Login succeeds locally but not prod | `COOKIE_SECURE=true` requires HTTPS; ensure requests go through Vercel proxy, not direct Render URL |
| `/api/v1/health` 404 on Vercel | `vercel.json` not deployed — merge to `main` and wait for Vercel rebuild |
| 502 / timeout on first request | Render cold start — retry after ~30s |
| DB connection errors | Use Neon **pooled** URL; check IP allowlist (Neon allows all by default) |
| Verification link wrong host | `FRONTEND_URL` must be `https://groupwork-rho.vercel.app` |

## CI/CD

- **CI:** GitHub Actions runs lint + tests on every push (`.github/workflows/`).
- **CD:** Vercel and Render auto-deploy from `main` via native GitHub integration — no custom pipeline required.
