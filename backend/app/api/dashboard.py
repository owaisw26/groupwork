from fastapi import APIRouter, Depends, Request
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.db.queries import dashboard as dashboard_queries
from app.middleware.auth import get_verified_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.get("")
def get_dashboard(request: Request, conn: connection = Depends(_get_db)):
    user = get_verified_user(request)
    return {
        "my_tasks": dashboard_queries.get_my_tasks(conn, user["id"]),
        "upcoming_deadlines": dashboard_queries.get_upcoming_deadlines(conn, user["id"]),
        "recent_activity": dashboard_queries.get_recent_activity(conn, user["id"]),
    }
