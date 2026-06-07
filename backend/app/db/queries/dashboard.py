from datetime import date, timedelta
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def get_my_tasks(conn: connection, user_id: str | UUID, *, limit: int = 10) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id, p.name
            FROM tasks t
            JOIN task_assignees ta ON ta.task_id = t.id
            JOIN projects p ON p.id = t.project_id
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
            WHERE ta.user_id = %s AND p.deleted_at IS NULL
            ORDER BY t.due_date NULLS LAST, t.created_at DESC
            LIMIT %s
            """,
            (str(user_id), str(user_id), limit),
        )
        rows = cur.fetchall()
    return [
        {
            "id": str(row[0]),
            "title": row[1],
            "status": row[2],
            "priority": row[3],
            "due_date": row[4].isoformat() if row[4] else None,
            "project_id": str(row[5]),
            "project_name": row[6],
        }
        for row in rows
    ]


def get_upcoming_deadlines(
    conn: connection,
    user_id: str | UUID,
    *,
    days: int = 7,
    limit: int = 10,
) -> list[dict[str, Any]]:
    end_date = date.today() + timedelta(days=days)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT t.id, t.title, t.due_date, t.project_id, p.name
            FROM tasks t
            JOIN task_assignees ta ON ta.task_id = t.id
            JOIN projects p ON p.id = t.project_id
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
            WHERE ta.user_id = %s
              AND p.deleted_at IS NULL
              AND t.due_date IS NOT NULL
              AND t.due_date BETWEEN CURRENT_DATE AND %s
            ORDER BY t.due_date ASC
            LIMIT %s
            """,
            (str(user_id), str(user_id), end_date, limit),
        )
        rows = cur.fetchall()
    return [
        {
            "id": str(row[0]),
            "title": row[1],
            "due_date": row[2].isoformat(),
            "project_id": str(row[3]),
            "project_name": row[4],
        }
        for row in rows
    ]


def get_recent_activity(
    conn: connection,
    user_id: str | UUID,
    *,
    limit: int = 10,
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT al.id, al.action_type, al.entity_type, al.entity_id,
                   al.created_at, al.project_id, p.name, u.full_name
            FROM activity_log al
            JOIN projects p ON p.id = al.project_id
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
            JOIN users u ON u.id = al.user_id
            WHERE p.deleted_at IS NULL
            ORDER BY al.created_at DESC
            LIMIT %s
            """,
            (str(user_id), limit),
        )
        rows = cur.fetchall()
    return [
        {
            "id": str(row[0]),
            "action_type": row[1],
            "entity_type": row[2],
            "entity_id": str(row[3]),
            "created_at": row[4].isoformat(),
            "project_id": str(row[5]),
            "project_name": row[6],
            "user_name": row[7],
        }
        for row in rows
    ]


def get_project_activity(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
    *,
    limit: int = 50,
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT al.id, al.action_type, al.entity_type, al.entity_id,
                   al.created_at, al.project_id, p.name, u.full_name
            FROM activity_log al
            JOIN projects p ON p.id = al.project_id
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
            JOIN users u ON u.id = al.user_id
            WHERE al.project_id = %s AND p.deleted_at IS NULL
            ORDER BY al.created_at DESC
            LIMIT %s
            """,
            (str(user_id), str(project_id), limit),
        )
        rows = cur.fetchall()
    return [
        {
            "id": str(row[0]),
            "action_type": row[1],
            "entity_type": row[2],
            "entity_id": str(row[3]),
            "created_at": row[4].isoformat(),
            "project_id": str(row[5]),
            "project_name": row[6],
            "user_name": row[7],
        }
        for row in rows
    ]
