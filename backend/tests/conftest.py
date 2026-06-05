import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from psycopg2.extensions import connection as PgConnection

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://groupwork:groupwork@localhost:5432/groupwork_test",
)
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-key-for-pytest-only")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("COOKIE_SECURE", "false")


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.middleware.rate_limit import limiter

    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()
    yield
    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()


@pytest.fixture(autouse=True)
def clear_settings_cache():
    from app.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def email_outbox(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, str]]:
    outbox: list[dict[str, str]] = []

    def fake_send_email(to: str, subject: str, html_body: str) -> None:
        outbox.append({"to": to, "subject": subject, "body": html_body})

    monkeypatch.setattr("app.utils.email.send_email", fake_send_email)
    return outbox


@pytest.fixture
def client(email_outbox: list[dict[str, str]]):
    from app.main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_client(client: TestClient, db_conn: PgConnection) -> Generator[TestClient, None, None]:
    from app.db.migrate import run_migrations

    run_migrations(db_conn)
    yield client


@pytest.fixture
def db_conn() -> PgConnection:
    from app.db.connection import close_pool, get_connection, init_pool

    close_pool()
    init_pool()

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA public CASCADE")
            cur.execute("CREATE SCHEMA public")

    with get_connection() as conn:
        yield conn

    close_pool()


EXPECTED_TABLES = [
    "schema_migrations",
    "users",
    "projects",
    "project_members",
    "invitations",
    "tasks",
    "task_assignees",
    "subtasks",
    "task_comments",
    "time_logs",
    "evidence_files",
    "task_verifications",
    "meetings",
    "meeting_attendance",
    "disputes",
    "dispute_votes",
    "peer_reviews",
    "notifications",
    "notification_preferences",
    "refresh_tokens",
    "task_edit_requests",
    "activity_log",
    "email_verifications",
    "password_resets",
]
