from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.tasks import CreateTimeLogRequest
from app.services import time_logs as time_log_service

router = APIRouter(tags=["time-logs"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/tasks/{task_id}/time-logs", status_code=status.HTTP_201_CREATED)
def create_time_log(
    task_id: UUID,
    request: Request,
    body: CreateTimeLogRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return time_log_service.create_time_log(
        conn,
        task_id,
        user,
        hours=body.hours,
        log_date=body.date,
        description=body.description,
    )


@router.get("/tasks/{task_id}/time-logs")
def list_time_logs(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return time_log_service.list_time_logs(conn, task_id, user["id"])
