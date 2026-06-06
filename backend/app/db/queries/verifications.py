from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_verification(
    conn: connection,
    *,
    task_id: str | UUID,
    user_id: str | UUID,
    status: str,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO task_verifications (task_id, user_id, status)
            VALUES (%s, %s, %s)
            RETURNING id, task_id, user_id, status, created_at
            """,
            (str(task_id), str(user_id), status),
        )
        row = cur.fetchone()
    return _public_verification(_row_to_verification(row))


def get_user_verification(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, user_id, status, created_at
            FROM task_verifications
            WHERE task_id = %s AND user_id = %s
            """,
            (str(task_id), str(user_id)),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_verification(row)


def get_task_verifications(conn: connection, task_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tv.id, tv.task_id, tv.user_id, tv.status, tv.created_at, u.full_name
            FROM task_verifications tv
            JOIN users u ON u.id = tv.user_id
            WHERE tv.task_id = %s
            ORDER BY tv.created_at ASC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [
        {
            **_public_verification(_row_to_verification(row[:5])),
            "user_name": row[5],
        }
        for row in rows
    ]


def update_user_verification_status(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    status: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE task_verifications
            SET status = %s
            WHERE task_id = %s AND user_id = %s
            """,
            (status, str(task_id), str(user_id)),
        )


def update_task_verification_status(
    conn: connection,
    task_id: str | UUID,
    verification_status: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE tasks
            SET verification_status = %s, updated_at = NOW()
            WHERE id = %s
            """,
            (verification_status, str(task_id)),
        )


def _row_to_verification(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "task_id": row[1],
        "user_id": row[2],
        "status": row[3],
        "created_at": row[4],
    }


def _public_verification(verification: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(verification["id"]),
        "task_id": str(verification["task_id"]),
        "user_id": str(verification["user_id"]),
        "status": verification["status"],
        "created_at": verification["created_at"].isoformat(),
    }
