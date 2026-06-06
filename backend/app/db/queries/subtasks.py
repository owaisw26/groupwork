from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_subtask(
    conn: connection,
    *,
    task_id: str | UUID,
    title: str,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO subtasks (task_id, title)
            VALUES (%s, %s)
            RETURNING id, task_id, title, is_completed, completed_by, completed_at
            """,
            (str(task_id), title),
        )
        row = cur.fetchone()
    return _row_to_subtask(row)


def list_subtasks(conn: connection, task_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, title, is_completed, completed_by, completed_at
            FROM subtasks
            WHERE task_id = %s
            ORDER BY id ASC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [_public_subtask(_row_to_subtask(row)) for row in rows]


def toggle_subtask(
    conn: connection,
    subtask_id: str | UUID,
    *,
    user_id: str | UUID,
    is_completed: bool,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        if is_completed:
            cur.execute(
                """
                UPDATE subtasks
                SET is_completed = TRUE, completed_by = %s, completed_at = NOW()
                WHERE id = %s
                RETURNING id, task_id, title, is_completed, completed_by, completed_at
                """,
                (str(user_id), str(subtask_id)),
            )
        else:
            cur.execute(
                """
                UPDATE subtasks
                SET is_completed = FALSE, completed_by = NULL, completed_at = NULL
                WHERE id = %s
                RETURNING id, task_id, title, is_completed, completed_by, completed_at
                """,
                (str(subtask_id),),
            )
        row = cur.fetchone()
    return _public_subtask(_row_to_subtask(row)) if row else None


def get_subtask(conn: connection, subtask_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, title, is_completed, completed_by, completed_at
            FROM subtasks
            WHERE id = %s
            """,
            (str(subtask_id),),
        )
        row = cur.fetchone()
    return _row_to_subtask(row) if row else None


def _row_to_subtask(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "task_id": row[1],
        "title": row[2],
        "is_completed": row[3],
        "completed_by": row[4],
        "completed_at": row[5],
    }


def _public_subtask(subtask: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(subtask["id"]),
        "task_id": str(subtask["task_id"]),
        "title": subtask["title"],
        "is_completed": subtask["is_completed"],
        "completed_by": str(subtask["completed_by"]) if subtask["completed_by"] else None,
        "completed_at": subtask["completed_at"].isoformat() if subtask["completed_at"] else None,
    }
