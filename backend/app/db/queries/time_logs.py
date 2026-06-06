from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_time_log(
    conn: connection,
    *,
    task_id: str | UUID,
    user_id: str | UUID,
    hours: Decimal,
    log_date: date,
    description: str | None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO time_logs (task_id, user_id, hours, date, description)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, task_id, user_id, hours, date, description, created_at
            """,
            (str(task_id), str(user_id), hours, log_date, description),
        )
        row = cur.fetchone()
    return _public_time_log(_row_to_time_log(row))


def list_task_time_logs(conn: connection, task_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tl.id, tl.task_id, tl.user_id, tl.hours, tl.date,
                   tl.description, tl.created_at, u.full_name
            FROM time_logs tl
            JOIN users u ON u.id = tl.user_id
            WHERE tl.task_id = %s
            ORDER BY tl.date DESC, tl.created_at DESC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [
        _public_time_log(_row_to_time_log(row[:7]), user_name=row[7]) for row in rows
    ]


def get_user_project_hours(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> Decimal:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(SUM(tl.hours), 0)
            FROM time_logs tl
            JOIN tasks t ON t.id = tl.task_id
            WHERE t.project_id = %s AND tl.user_id = %s
            """,
            (str(project_id), str(user_id)),
        )
        return cur.fetchone()[0]


def _row_to_time_log(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "task_id": row[1],
        "user_id": row[2],
        "hours": row[3],
        "date": row[4],
        "description": row[5],
        "created_at": row[6],
    }


def _public_time_log(time_log: dict[str, Any], *, user_name: str | None = None) -> dict[str, Any]:
    hours = time_log["hours"]
    if isinstance(hours, Decimal):
        hours = float(hours)
    data = {
        "id": str(time_log["id"]),
        "task_id": str(time_log["task_id"]),
        "user_id": str(time_log["user_id"]),
        "hours": hours,
        "date": time_log["date"].isoformat(),
        "description": time_log["description"],
        "created_at": time_log["created_at"].isoformat(),
    }
    if user_name is not None:
        data["user_name"] = user_name
    return data
