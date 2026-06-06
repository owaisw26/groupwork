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


def get_dispute(conn: connection, dispute_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, filed_by, reason, status, outcome, created_at, resolved_at
            FROM disputes
            WHERE id = %s
            """,
            (str(dispute_id),),
        )
        row = cur.fetchone()
    return _row_to_dispute(row) if row else None


def list_task_disputes(conn: connection, task_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, filed_by, reason, status, outcome, created_at, resolved_at
            FROM disputes
            WHERE task_id = %s
            ORDER BY created_at ASC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [_public_dispute(_row_to_dispute(row)) for row in rows]


def cast_vote(
    conn: connection,
    *,
    dispute_id: str | UUID,
    user_id: str | UUID,
    vote: str,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO dispute_votes (dispute_id, user_id, vote)
            VALUES (%s, %s, %s)
            RETURNING id, dispute_id, user_id, vote, created_at
            """,
            (str(dispute_id), str(user_id), vote),
        )
        row = cur.fetchone()
    return _public_vote(_row_to_vote(row))


def get_user_vote(
    conn: connection,
    dispute_id: str | UUID,
    user_id: str | UUID,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, dispute_id, user_id, vote, created_at
            FROM dispute_votes
            WHERE dispute_id = %s AND user_id = %s
            """,
            (str(dispute_id), str(user_id)),
        )
        row = cur.fetchone()
    return _row_to_vote(row) if row else None


def list_dispute_votes(conn: connection, dispute_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT dv.id, dv.dispute_id, dv.user_id, dv.vote, dv.created_at, u.full_name
            FROM dispute_votes dv
            JOIN users u ON u.id = dv.user_id
            WHERE dv.dispute_id = %s
            ORDER BY dv.created_at ASC
            """,
            (str(dispute_id),),
        )
        rows = cur.fetchall()
    return [_public_vote_with_user(row) for row in rows]


def resolve_dispute(
    conn: connection,
    dispute_id: str | UUID,
    *,
    outcome: str,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE disputes
            SET status = 'resolved', outcome = %s, resolved_at = NOW()
            WHERE id = %s AND status = 'open'
            RETURNING id, task_id, filed_by, reason, status, outcome, created_at, resolved_at
            """,
            (outcome, str(dispute_id)),
        )
        row = cur.fetchone()
    return _public_dispute(_row_to_dispute(row)) if row else None


def as_public_dispute(dispute: dict[str, Any]) -> dict[str, Any]:
    if isinstance(dispute.get("created_at"), str):
        return dispute
    return _public_dispute(dispute)


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


def _row_to_vote(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "dispute_id": row[1],
        "user_id": row[2],
        "vote": row[3],
        "created_at": row[4],
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


def _public_vote(vote: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(vote["id"]),
        "dispute_id": str(vote["dispute_id"]),
        "user_id": str(vote["user_id"]),
        "vote": vote["vote"],
        "created_at": vote["created_at"].isoformat(),
    }


def _public_vote_with_user(row: tuple) -> dict[str, Any]:
    return {
        "id": str(row[0]),
        "dispute_id": str(row[1]),
        "user_id": str(row[2]),
        "vote": row[3],
        "created_at": row[4].isoformat(),
        "user_name": row[5],
    }
