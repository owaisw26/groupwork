from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection

COMMENT_EDIT_WINDOW_MINUTES = 5


def create_comment(
    conn: connection,
    *,
    task_id: str | UUID,
    user_id: str | UUID,
    content: str,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO task_comments (task_id, user_id, content)
            VALUES (%s, %s, %s)
            RETURNING id, task_id, user_id, content, created_at
            """,
            (str(task_id), str(user_id), content),
        )
        row = cur.fetchone()
    return _public_comment(_row_to_comment(row))


def list_task_comments(conn: connection, task_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.task_id, c.user_id, c.content, c.created_at, u.full_name
            FROM task_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.task_id = %s
            ORDER BY c.created_at ASC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [_public_comment(_row_to_comment(row[:5]), author_name=row[5]) for row in rows]


def get_comment(conn: connection, comment_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, user_id, content, created_at
            FROM task_comments
            WHERE id = %s
            """,
            (str(comment_id),),
        )
        row = cur.fetchone()
    return _row_to_comment(row) if row else None


def update_comment(
    conn: connection,
    comment_id: str | UUID,
    *,
    user_id: str | UUID,
    content: str,
) -> dict[str, Any] | None:
    comment = get_comment(conn, comment_id)
    if not comment:
        return None
    if str(comment["user_id"]) != str(user_id):
        return None

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=COMMENT_EDIT_WINDOW_MINUTES)
    created_at = comment["created_at"]
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if created_at < cutoff:
        raise ValueError("edit_window_expired")

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE task_comments SET content = %s
            WHERE id = %s
            RETURNING id, task_id, user_id, content, created_at
            """,
            (content, str(comment_id)),
        )
        row = cur.fetchone()
    return _public_comment(_row_to_comment(row)) if row else None


def _row_to_comment(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "task_id": row[1],
        "user_id": row[2],
        "content": row[3],
        "created_at": row[4],
    }


def _public_comment(comment: dict[str, Any], *, author_name: str | None = None) -> dict[str, Any]:
    data = {
        "id": str(comment["id"]),
        "task_id": str(comment["task_id"]),
        "user_id": str(comment["user_id"]),
        "content": comment["content"],
        "created_at": comment["created_at"].isoformat(),
    }
    if author_name is not None:
        data["author_name"] = author_name
    return data
