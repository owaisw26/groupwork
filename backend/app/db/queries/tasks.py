from datetime import date
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection

from app.utils.pagination import decode_cursor, encode_cursor, format_cursor_datetime

VALID_STATUSES = {"todo", "in_progress", "review", "done"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_SORT_FIELDS = {"due_date", "priority", "created_at", "status", "title"}

_TASK_COLUMNS = """
    t.id, t.project_id, t.title, t.description, t.status, t.priority,
    t.due_date, t.verification_status, t.created_by, t.created_at, t.updated_at
"""

_PRIORITY_ORDER = {"urgent": 0, "high": 1, "medium": 2, "low": 3}


def create_task(
    conn: connection,
    *,
    project_id: str | UUID,
    title: str,
    description: str | None,
    status: str,
    priority: str,
    due_date: date | None,
    created_by: str | UUID,
    assignee_ids: list[str | UUID] | None = None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO tasks (
                project_id, title, description, status, priority, due_date, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, project_id, title, description, status, priority,
                      due_date, verification_status, created_by, created_at, updated_at
            """,
            (
                str(project_id),
                title,
                description,
                status,
                priority,
                due_date,
                str(created_by),
            ),
        )
        row = cur.fetchone()
        task = _row_to_task(row)
        if assignee_ids:
            for assignee_id in assignee_ids:
                cur.execute(
                    """
                    INSERT INTO task_assignees (task_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (str(task["id"]), str(assignee_id)),
                )
    task["assignee_ids"] = _get_assignee_ids(conn, task["id"])
    return task


def get_task(conn: connection, task_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_TASK_COLUMNS.strip()}
            FROM tasks t
            WHERE t.id = %s
            """,
            (str(task_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    task = _row_to_task(row)
    task["assignee_ids"] = _get_assignee_ids(conn, task_id)
    return task


def list_project_tasks(
    conn: connection,
    project_id: str | UUID,
    *,
    status: str | None = None,
    assignee_id: str | UUID | None = None,
    priority: str | None = None,
    cursor: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    conditions = ["t.project_id = %s"]
    params: list[Any] = [str(project_id)]

    if status:
        conditions.append("t.status = %s")
        params.append(status)
    if priority:
        conditions.append("t.priority = %s")
        params.append(priority)
    if assignee_id:
        conditions.append(
            """
            EXISTS (
                SELECT 1 FROM task_assignees ta
                WHERE ta.task_id = t.id AND ta.user_id = %s
            )
            """
        )
        params.append(str(assignee_id))

    if cursor:
        cursor_created_at, cursor_id = decode_cursor(cursor)
        conditions.append("(t.created_at, t.id) < (%s::timestamptz, %s::uuid)")
        params.extend([cursor_created_at, cursor_id])

    params.append(limit + 1)
    where_clause = " AND ".join(conditions)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_TASK_COLUMNS.strip()}
            FROM tasks t
            WHERE {where_clause}
            ORDER BY t.created_at DESC, t.id DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = cur.fetchall()

    has_more = len(rows) > limit
    items_rows = rows[:limit]
    items = []
    for row in items_rows:
        task = _row_to_task(row)
        task["assignee_ids"] = _get_assignee_ids(conn, task["id"])
        items.append(_public_task(task))

    next_cursor = None
    if has_more and items_rows:
        last = _row_to_task(items_rows[-1])
        next_cursor = encode_cursor(
            sort_value=format_cursor_datetime(last["created_at"]),
            item_id=last["id"],
        )

    return {"items": items, "next_cursor": next_cursor}


def list_user_tasks_across_projects(
    conn: connection,
    user_id: str | UUID,
    *,
    sort_by: str = "due_date",
    sort_order: str = "asc",
    cursor: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    if sort_by not in VALID_SORT_FIELDS:
        sort_by = "due_date"
    if sort_order not in {"asc", "desc"}:
        sort_order = "asc"

    order_sql = _sort_clause(sort_by, sort_order)
    conditions = [
        "ta.user_id = %s",
        "p.deleted_at IS NULL",
    ]
    params: list[Any] = [str(user_id)]

    if cursor:
        cursor_value, cursor_id = decode_cursor(cursor)
        comparator = ">" if sort_order == "asc" else "<"
        sort_expr = _sort_expression(sort_by)
        if sort_by == "due_date":
            conditions.append(
                f"({sort_expr}, t.id) {comparator} (%s::date, %s::uuid)"
            )
            params.extend([cursor_value if cursor_value != "null" else None, cursor_id])
        elif sort_by == "created_at":
            conditions.append(
                f"({sort_expr}, t.id) {comparator} (%s::timestamptz, %s::uuid)"
            )
            params.extend([cursor_value, cursor_id])
        else:
            conditions.append(
                f"({sort_expr}, t.id) {comparator} (%s, %s::uuid)"
            )
            params.extend([cursor_value, cursor_id])

    params.append(limit + 1)
    where_clause = " AND ".join(conditions)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_TASK_COLUMNS.strip()}, p.name AS project_name
            FROM tasks t
            JOIN task_assignees ta ON ta.task_id = t.id
            JOIN projects p ON p.id = t.project_id
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
            WHERE {where_clause}
            ORDER BY {order_sql}, t.id {sort_order.upper()}
            LIMIT %s
            """,
            (str(user_id), *params),
        )
        rows = cur.fetchall()

    has_more = len(rows) > limit
    items_rows = rows[:limit]
    items = []
    for row in items_rows:
        task = _row_to_task(row[:11])
        task["project_name"] = row[11]
        task["assignee_ids"] = _get_assignee_ids(conn, task["id"])
        items.append(_public_task(task, include_project_name=True))

    next_cursor = None
    if has_more and items_rows:
        last_row = items_rows[-1]
        last_task = _row_to_task(last_row[:11])
        sort_value = _cursor_sort_value(sort_by, last_task)
        next_cursor = encode_cursor(sort_value=sort_value, item_id=last_task["id"])

    return {"items": items, "next_cursor": next_cursor}


def search_tasks_by_title(
    conn: connection,
    user_id: str | UUID,
    *,
    query: str,
    cursor: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    conditions = [
        "p.deleted_at IS NULL",
        "t.title ILIKE %s",
    ]
    params: list[Any] = [str(user_id), f"%{query}%"]

    if cursor:
        cursor_created_at, cursor_id = decode_cursor(cursor)
        conditions.append("(t.created_at, t.id) < (%s::timestamptz, %s::uuid)")
        params.extend([cursor_created_at, cursor_id])

    params.append(limit + 1)
    where_clause = " AND ".join(conditions)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_TASK_COLUMNS.strip()}, p.name AS project_name
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = %s
            WHERE {where_clause}
            ORDER BY t.created_at DESC, t.id DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = cur.fetchall()

    has_more = len(rows) > limit
    items_rows = rows[:limit]
    items = []
    for row in items_rows:
        task = _row_to_task(row[:11])
        task["project_name"] = row[11]
        task["assignee_ids"] = _get_assignee_ids(conn, task["id"])
        items.append(_public_task(task, include_project_name=True))

    next_cursor = None
    if has_more and items_rows:
        last = _row_to_task(items_rows[-1][:11])
        next_cursor = encode_cursor(
            sort_value=format_cursor_datetime(last["created_at"]),
            item_id=last["id"],
        )

    return {"items": items, "next_cursor": next_cursor}


def update_task(
    conn: connection,
    task_id: str | UUID,
    *,
    title: str | None = None,
    description: str | None = None,
    priority: str | None = None,
    due_date: date | None = None,
    assignee_ids: list[str | UUID] | None = None,
) -> dict[str, Any] | None:
    updates: list[str] = []
    params: list[Any] = []

    if title is not None:
        updates.append("title = %s")
        params.append(title)
    if description is not None:
        updates.append("description = %s")
        params.append(description)
    if priority is not None:
        updates.append("priority = %s")
        params.append(priority)
    if due_date is not None:
        updates.append("due_date = %s")
        params.append(due_date)

    if not updates and assignee_ids is None:
        return get_task(conn, task_id)

    if updates:
        updates.append("updated_at = NOW()")
        params.append(str(task_id))
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE tasks SET {", ".join(updates)}
                WHERE id = %s
                RETURNING id, project_id, title, description, status, priority,
                          due_date, verification_status, created_by, created_at, updated_at
                """,
                tuple(params),
            )
            row = cur.fetchone()
        if not row:
            return None
    else:
        existing = get_task(conn, task_id)
        if not existing:
            return None

    if assignee_ids is not None:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM task_assignees WHERE task_id = %s", (str(task_id),))
            for assignee_id in assignee_ids:
                cur.execute(
                    """
                    INSERT INTO task_assignees (task_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (str(task_id), str(assignee_id)),
                )

    return get_task(conn, task_id)


def update_task_status(
    conn: connection,
    task_id: str | UUID,
    status: str,
) -> dict[str, Any] | None:
    verification_status = "pending" if status == "done" else "none"
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE tasks
            SET status = %s, verification_status = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, project_id, title, description, status, priority,
                      due_date, verification_status, created_by, created_at, updated_at
            """,
            (status, verification_status, str(task_id)),
        )
        row = cur.fetchone()
    if not row:
        return None
    task = _row_to_task(row)
    task["assignee_ids"] = _get_assignee_ids(conn, task_id)
    return task


def delete_task(conn: connection, task_id: str | UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM tasks WHERE id = %s RETURNING id", (str(task_id),))
        return cur.fetchone() is not None


def is_task_assignee(conn: connection, task_id: str | UUID, user_id: str | UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM task_assignees
            WHERE task_id = %s AND user_id = %s
            """,
            (str(task_id), str(user_id)),
        )
        return cur.fetchone() is not None


def set_assignees(
    conn: connection,
    task_id: str | UUID,
    assignee_ids: list[str | UUID],
) -> None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM task_assignees WHERE task_id = %s", (str(task_id),))
        for assignee_id in assignee_ids:
            cur.execute(
                """
                INSERT INTO task_assignees (task_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (str(task_id), str(assignee_id)),
            )


def _get_assignee_ids(conn: connection, task_id: str | UUID) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM task_assignees WHERE task_id = %s ORDER BY user_id",
            (str(task_id),),
        )
        return [str(row[0]) for row in cur.fetchall()]


def _row_to_task(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "project_id": row[1],
        "title": row[2],
        "description": row[3],
        "status": row[4],
        "priority": row[5],
        "due_date": row[6],
        "verification_status": row[7],
        "created_by": row[8],
        "created_at": row[9],
        "updated_at": row[10],
    }


def _public_task(task: dict[str, Any], *, include_project_name: bool = False) -> dict[str, Any]:
    data = {
        "id": str(task["id"]),
        "project_id": str(task["project_id"]),
        "title": task["title"],
        "description": task["description"],
        "status": task["status"],
        "priority": task["priority"],
        "due_date": task["due_date"].isoformat() if task["due_date"] else None,
        "verification_status": task["verification_status"],
        "created_by": str(task["created_by"]),
        "created_at": task["created_at"].isoformat(),
        "updated_at": task["updated_at"].isoformat(),
        "assignee_ids": task.get("assignee_ids", []),
    }
    if include_project_name:
        data["project_name"] = task.get("project_name")
    return data


def _sort_expression(sort_by: str) -> str:
    if sort_by == "priority":
        return (
            "CASE t.priority "
            "WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 "
            "WHEN 'medium' THEN 2 ELSE 3 END"
        )
    if sort_by == "due_date":
        return "t.due_date"
    if sort_by == "created_at":
        return "t.created_at"
    if sort_by == "status":
        return "t.status"
    return "t.title"


def _sort_clause(sort_by: str, sort_order: str) -> str:
    direction = sort_order.upper()
    if sort_by == "due_date":
        nulls = "NULLS LAST" if sort_order == "asc" else "NULLS FIRST"
        return f"t.due_date {direction} {nulls}"
    if sort_by == "priority":
        expr = _sort_expression("priority")
        return f"{expr} {direction}"
    if sort_by == "created_at":
        return f"t.created_at {direction}"
    if sort_by == "status":
        return f"t.status {direction}"
    return f"t.title {direction}"


def _cursor_sort_value(sort_by: str, task: dict[str, Any]) -> str:
    if sort_by == "due_date":
        return task["due_date"].isoformat() if task["due_date"] else "null"
    if sort_by == "created_at":
        return format_cursor_datetime(task["created_at"])
    if sort_by == "priority":
        return str(_PRIORITY_ORDER.get(task["priority"], 3))
    return str(task[sort_by])
