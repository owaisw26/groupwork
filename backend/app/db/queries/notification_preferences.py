from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def get_preferences(conn: connection, user_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT notification_type, email_enabled
            FROM notification_preferences
            WHERE user_id = %s
            ORDER BY notification_type
            """,
            (str(user_id),),
        )
        rows = cur.fetchall()
    return [
        {"notification_type": row[0], "email_enabled": row[1]}
        for row in rows
    ]


def get_preference(
    conn: connection,
    user_id: str | UUID,
    notification_type: str,
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT email_enabled FROM notification_preferences
            WHERE user_id = %s AND notification_type = %s
            """,
            (str(user_id), notification_type),
        )
        row = cur.fetchone()
    if row is None:
        return True
    return row[0]


def update_preference(
    conn: connection,
    user_id: str | UUID,
    notification_type: str,
    *,
    email_enabled: bool,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notification_preferences (user_id, notification_type, email_enabled)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, notification_type)
            DO UPDATE SET email_enabled = EXCLUDED.email_enabled
            RETURNING notification_type, email_enabled
            """,
            (str(user_id), notification_type, email_enabled),
        )
        row = cur.fetchone()
    return {"notification_type": row[0], "email_enabled": row[1]}
