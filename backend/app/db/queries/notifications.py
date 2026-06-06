from typing import Any
from uuid import UUID

from psycopg2.extensions import connection

from app.utils.pagination import decode_cursor, encode_cursor, format_cursor_datetime


def create_notification(
    conn: connection,
    *,
    user_id: str | UUID,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: str | UUID | None = None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (
                user_id, type, title, message, related_entity_type, related_entity_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, type, title, message, is_read,
                      related_entity_type, related_entity_id, created_at
            """,
            (
                str(user_id),
                notification_type,
                title,
                message,
                entity_type,
                str(entity_id) if entity_id else None,
            ),
        )
        row = cur.fetchone()
    return _public_notification(_row_to_notification(row))


def list_user_notifications(
    conn: connection,
    user_id: str | UUID,
    *,
    cursor: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    params: list[Any] = [str(user_id)]
    cursor_clause = ""
    if cursor:
        cursor_created_at, cursor_id = decode_cursor(cursor)
        cursor_clause = "AND (created_at, id) < (%s::timestamptz, %s::uuid)"
        params.extend([cursor_created_at, cursor_id])

    params.append(limit + 1)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, user_id, type, title, message, is_read,
                   related_entity_type, related_entity_id, created_at
            FROM notifications
            WHERE user_id = %s {cursor_clause}
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = cur.fetchall()

    items = [_public_notification(_row_to_notification(row)) for row in rows[:limit]]
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = encode_cursor(
            sort_value=format_cursor_datetime(last[8]),
            item_id=str(last[0]),
        )
    return {"items": items, "next_cursor": next_cursor}


def mark_read(
    conn: connection,
    notification_id: str | UUID,
    user_id: str | UUID,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s AND user_id = %s
            RETURNING id, user_id, type, title, message, is_read,
                      related_entity_type, related_entity_id, created_at
            """,
            (str(notification_id), str(user_id)),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _public_notification(_row_to_notification(row))


def mark_all_read(conn: connection, user_id: str | UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE
            """,
            (str(user_id),),
        )
        return cur.rowcount


def get_unread_count(conn: connection, user_id: str | UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM notifications
            WHERE user_id = %s AND is_read = FALSE
            """,
            (str(user_id),),
        )
        return cur.fetchone()[0]


def get_notification(
    conn: connection,
    notification_id: str | UUID,
    user_id: str | UUID,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, type, title, message, is_read,
                   related_entity_type, related_entity_id, created_at
            FROM notifications
            WHERE id = %s AND user_id = %s
            """,
            (str(notification_id), str(user_id)),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_notification(row)


def _row_to_notification(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "user_id": row[1],
        "type": row[2],
        "title": row[3],
        "message": row[4],
        "is_read": row[5],
        "related_entity_type": row[6],
        "related_entity_id": row[7],
        "created_at": row[8],
    }


def _public_notification(notification: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(notification["id"]),
        "type": notification["type"],
        "title": notification["title"],
        "message": notification["message"],
        "is_read": notification["is_read"],
        "related_entity_type": notification["related_entity_type"],
        "related_entity_id": (
            str(notification["related_entity_id"])
            if notification["related_entity_id"]
            else None
        ),
        "created_at": notification["created_at"].isoformat(),
    }
