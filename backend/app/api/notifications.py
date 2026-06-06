from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.notifications import UpdateNotificationPreferenceRequest
from app.services import notifications as notification_service

router = APIRouter(tags=["notifications"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.get("/notifications")
def list_notifications(
    request: Request,
    conn: connection = Depends(_get_db),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    user = get_verified_user(request)
    return notification_service.list_notifications(
        conn, user["id"], cursor=cursor, limit=limit
    )


@router.get("/notifications/unread-count")
def unread_count(
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return notification_service.get_unread_count(conn, user["id"])


@router.put("/notifications/{notification_id}/read")
def mark_read(
    notification_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return notification_service.mark_notification_read(conn, notification_id, user["id"])


@router.put("/notifications/read-all")
def mark_all_read(
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return notification_service.mark_all_notifications_read(conn, user["id"])


@router.get("/users/me/notification-preferences")
def get_preferences(
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return notification_service.get_preferences(conn, user["id"])


@router.put("/users/me/notification-preferences")
def update_preference(
    request: Request,
    body: UpdateNotificationPreferenceRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return notification_service.update_preference(
        conn,
        user["id"],
        notification_type=body.notification_type,
        email_enabled=body.email_enabled,
    )
