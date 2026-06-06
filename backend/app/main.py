import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.disputes import router as disputes_router
from app.api.evidence import router as evidence_router
from app.api.health import router as health_router
from app.api.invitations import router as invitations_router
from app.api.meetings import router as meetings_router
from app.api.notifications import router as notifications_router
from app.api.peer_reviews import router as peer_reviews_router
from app.api.projects import router as projects_router
from app.api.search import router as search_router
from app.api.tasks import router as tasks_router
from app.api.time_logs import router as time_logs_router
from app.api.users import router as users_router
from app.config import get_settings
from app.db.connection import close_pool, init_pool
from app.middleware.csrf import CSRFMiddleware
from app.middleware.error_handler import register_exception_handlers
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import limiter
from app.middleware.security_headers import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, init_pool)
    yield
    await loop.run_in_executor(None, close_pool)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="GroupWork API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.state.limiter = limiter
    register_exception_handlers(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "X-CSRF-Token", "Authorization"],
    )
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(health_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(projects_router, prefix="/api/v1")
    app.include_router(invitations_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(tasks_router, prefix="/api/v1")
    app.include_router(disputes_router, prefix="/api/v1")
    app.include_router(time_logs_router, prefix="/api/v1")
    app.include_router(search_router, prefix="/api/v1")
    app.include_router(evidence_router, prefix="/api/v1")
    app.include_router(meetings_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(peer_reviews_router, prefix="/api/v1")

    return app
