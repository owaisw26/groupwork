import json
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_edit_request(
    conn: connection,
    *,
    task_id: str | UUID,
    requested_by: str | UUID,
    proposed_changes: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO task_edit_requests (task_id, requested_by, proposed_changes_json)
            VALUES (%s, %s, %s::jsonb)
            RETURNING id, task_id, requested_by, proposed_changes_json, status,
                      reviewed_by, created_at, reviewed_at
            """,
            (str(task_id), str(requested_by), json.dumps(proposed_changes)),
        )
        row = cur.fetchone()
    return _public_edit_request(_row_to_edit_request(row))


def get_edit_request(conn: connection, request_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, requested_by, proposed_changes_json, status,
                   reviewed_by, created_at, reviewed_at
            FROM task_edit_requests
            WHERE id = %s
            """,
            (str(request_id),),
        )
        row = cur.fetchone()
    return _row_to_edit_request(row) if row else None


def list_pending_edit_requests(
    conn: connection,
    task_id: str | UUID,
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, requested_by, proposed_changes_json, status,
                   reviewed_by, created_at, reviewed_at
            FROM task_edit_requests
            WHERE task_id = %s AND status = 'pending'
            ORDER BY created_at ASC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [_public_edit_request(_row_to_edit_request(row)) for row in rows]


def review_edit_request(
    conn: connection,
    request_id: str | UUID,
    *,
    reviewed_by: str | UUID,
    approved: bool,
) -> dict[str, Any] | None:
    status = "approved" if approved else "rejected"
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE task_edit_requests
            SET status = %s, reviewed_by = %s, reviewed_at = NOW()
            WHERE id = %s AND status = 'pending'
            RETURNING id, task_id, requested_by, proposed_changes_json, status,
                      reviewed_by, created_at, reviewed_at
            """,
            (status, str(reviewed_by), str(request_id)),
        )
        row = cur.fetchone()
    return _public_edit_request(_row_to_edit_request(row)) if row else None


def _row_to_edit_request(row: tuple) -> dict[str, Any]:
    changes = row[3]
    if isinstance(changes, str):
        changes = json.loads(changes)
    return {
        "id": row[0],
        "task_id": row[1],
        "requested_by": row[2],
        "proposed_changes": changes,
        "status": row[4],
        "reviewed_by": row[5],
        "created_at": row[6],
        "reviewed_at": row[7],
    }


def _public_edit_request(request: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(request["id"]),
        "task_id": str(request["task_id"]),
        "requested_by": str(request["requested_by"]),
        "proposed_changes": request["proposed_changes"],
        "status": request["status"],
        "reviewed_by": str(request["reviewed_by"]) if request["reviewed_by"] else None,
        "created_at": request["created_at"].isoformat(),
        "reviewed_at": request["reviewed_at"].isoformat() if request["reviewed_at"] else None,
    }
