from fastapi import APIRouter, Depends, Query, Request
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.services import tasks as task_service

router = APIRouter(prefix="/search", tags=["search"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.get("/tasks")
def search_tasks(
    request: Request,
    conn: connection = Depends(_get_db),
    q: str = Query(default=""),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    user = get_verified_user(request)
    return task_service.search_tasks(
        conn,
        user["id"],
        query=q,
        cursor=cursor,
        limit=limit,
    )
