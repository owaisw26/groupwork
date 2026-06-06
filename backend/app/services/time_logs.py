from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import tasks as task_queries
from app.db.queries import time_logs as time_log_queries
from app.services import tasks as task_service


def create_time_log(
    conn: connection,
    task_id: str | UUID,
    user: dict,
    *,
    hours: float,
    log_date: date,
    description: str | None,
) -> dict:
    task_service._require_task_access(conn, task_id, user["id"])
    if not task_queries.is_task_assignee(conn, task_id, user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only task assignees can log time",
        )
    return time_log_queries.create_time_log(
        conn,
        task_id=task_id,
        user_id=user["id"],
        hours=Decimal(str(hours)),
        log_date=log_date,
        description=description,
    )


def list_time_logs(conn: connection, task_id: str | UUID, user_id: str | UUID) -> dict:
    task = task_service._require_task_access(conn, task_id, user_id)
    items = time_log_queries.list_task_time_logs(conn, task_id)
    total_hours = time_log_queries.get_user_project_hours(
        conn, task["project_id"], user_id
    )
    total = float(total_hours) if isinstance(total_hours, Decimal) else total_hours
    return {"items": items, "total_hours_for_user_in_project": total}
