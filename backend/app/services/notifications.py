from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import notification_preferences as preference_queries
from app.db.queries import notifications as notification_queries
from app.utils.pagination import decode_cursor

def notify(
    conn: connection,
    *,
    user_id: str | UUID,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: str | UUID | None = None,
    email_subject: str | None = None,
    email_body: str | None = None,
    recipient_email: str | None = None,
) -> dict:
    notification = notification_queries.create_notification(
        conn,
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    return notification


def list_notifications(
    conn: connection,
    user_id: str | UUID,
    *,
    cursor: str | None = None,
    limit: int = 20,
) -> dict:
    if cursor:
        try:
            decode_cursor(cursor)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor",
            ) from exc
    return notification_queries.list_user_notifications(
        conn,
        user_id,
        cursor=cursor,
        limit=min(limit, 100),
    )


def mark_notification_read(
    conn: connection,
    notification_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    updated = notification_queries.mark_read(conn, notification_id, user_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return updated


def mark_all_notifications_read(conn: connection, user_id: str | UUID) -> dict:
    count = notification_queries.mark_all_read(conn, user_id)
    return {"marked_read": count}


def get_unread_count(conn: connection, user_id: str | UUID) -> dict:
    return {"count": notification_queries.get_unread_count(conn, user_id)}


def get_preferences(conn: connection, user_id: str | UUID) -> dict:
    return {"items": preference_queries.get_preferences(conn, user_id)}


def update_preference(
    conn: connection,
    user_id: str | UUID,
    *,
    notification_type: str,
    email_enabled: bool,
) -> dict:
    return preference_queries.update_preference(
        conn,
        user_id,
        notification_type,
        email_enabled=email_enabled,
    )
