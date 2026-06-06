from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_invitation(
    conn: connection,
    *,
    project_id: str | UUID,
    inviter_id: str | UUID,
    invitee_email: str,
    token: str,
    expires_at: datetime,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO invitations (project_id, inviter_id, invitee_email, token, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, project_id, inviter_id, invitee_email, token,
                      status, created_at, expires_at
            """,
            (str(project_id), str(inviter_id), invitee_email, token, expires_at),
        )
        row = cur.fetchone()
    return _row_to_invitation(row)


def get_invitation_by_token(conn: connection, token: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, project_id, inviter_id, invitee_email, token, status, created_at, expires_at
            FROM invitations WHERE token = %s
            """,
            (token,),
        )
        row = cur.fetchone()
    return _row_to_invitation(row) if row else None


def get_pending_invitation(
    conn: connection, project_id: str | UUID, invitee_email: str
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, project_id, inviter_id, invitee_email, token, status, created_at, expires_at
            FROM invitations
            WHERE project_id = %s AND invitee_email = %s AND status = 'pending'
            """,
            (str(project_id), invitee_email),
        )
        row = cur.fetchone()
    return _row_to_invitation(row) if row else None


def accept_invitation(conn: connection, invitation_id: str | UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE invitations SET status = 'accepted'
            WHERE id = %s AND status = 'pending'
            RETURNING id
            """,
            (str(invitation_id),),
        )
        return cur.fetchone() is not None


def list_project_invitations(conn: connection, project_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, project_id, inviter_id, invitee_email, token, status, created_at, expires_at
            FROM invitations WHERE project_id = %s ORDER BY created_at DESC
            """,
            (str(project_id),),
        )
        rows = cur.fetchall()
    return [_row_to_invitation(row) for row in rows]


def _row_to_invitation(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "project_id": row[1],
        "inviter_id": row[2],
        "invitee_email": row[3],
        "token": row[4],
        "status": row[5],
        "created_at": row[6],
        "expires_at": row[7],
    }
