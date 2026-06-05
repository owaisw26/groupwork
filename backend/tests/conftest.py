import os

import pytest
from fastapi.testclient import TestClient
from psycopg2.extensions import connection as PgConnection

os.environ.setdefault("DATABASE_URL", "postgresql://localhost:5432/groupwork_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-key-for-pytest-only")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")


@pytest.fixture(autouse=True)
def clear_settings_cache():
    from app.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    from app.main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_conn() -> PgConnection:
    from app.db.connection import close_pool, get_connection, init_pool

    close_pool()
    init_pool()

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA public CASCADE")
            cur.execute("CREATE SCHEMA public")
        conn.commit()
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
