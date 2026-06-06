from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_dispute(
    conn: connection,
    *,
    task_id: str | UUID,
    filed_by: str | UUID,
    reason: str,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO disputes (task_id, filed_by, reason)
            VALUES (%s, %s, %s)
            RETURNING id, task_id, filed_by, reason, status, outcome, created_at, resolved_at
            """,
            (str(task_id), str(filed_by), reason),
        )
        row = cur.fetchone()
    return _public_dispute(_row_to_dispute(row))


def _row_to_dispute(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "task_id": row[1],
        "filed_by": row[2],
        "reason": row[3],
        "status": row[4],
        "outcome": row[5],
        "created_at": row[6],
        "resolved_at": row[7],
    }


def _public_dispute(dispute: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(dispute["id"]),
        "task_id": str(dispute["task_id"]),
        "filed_by": str(dispute["filed_by"]),
        "reason": dispute["reason"],
        "status": dispute["status"],
        "outcome": dispute["outcome"],
        "created_at": dispute["created_at"].isoformat(),
        "resolved_at": dispute["resolved_at"].isoformat() if dispute["resolved_at"] else None,
    }
