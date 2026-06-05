from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_refresh_token(
    conn: connection,
    *,
    user_id: str | UUID,
    token_hash: str,
    expires_at: datetime,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (str(user_id), token_hash, expires_at),
        )


def get_refresh_token(conn: connection, token_hash: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, token_hash, expires_at, created_at, revoked
            FROM refresh_tokens
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "token_hash": row[2],
        "expires_at": row[3],
        "created_at": row[4],
        "revoked": row[5],
    }


def try_consume_refresh_token(conn: connection, token_hash: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE refresh_tokens
            SET revoked = TRUE
            WHERE token_hash = %s AND revoked = FALSE AND expires_at > NOW()
            RETURNING id, user_id, token_hash, expires_at, created_at
            """,
            (token_hash,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "token_hash": row[2],
        "expires_at": row[3],
        "created_at": row[4],
        "revoked": True,
    }


def revoke_refresh_token(conn: connection, token_hash: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = %s",
            (token_hash,),
        )


def revoke_all_user_tokens(conn: connection, user_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = %s",
            (str(user_id),),
        )


def create_email_verification(
    conn: connection,
    *,
    user_id: str | UUID,
    token_hash: str,
    expires_at: datetime,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO email_verifications (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (str(user_id), token_hash, expires_at),
        )


def get_email_verification(conn: connection, token_hash: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, token_hash, expires_at, created_at, verified_at
            FROM email_verifications
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "token_hash": row[2],
        "expires_at": row[3],
        "created_at": row[4],
        "verified_at": row[5],
    }


def mark_email_verified(conn: connection, verification_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE email_verifications
            SET verified_at = NOW()
            WHERE id = %s
            """,
            (str(verification_id),),
        )


def invalidate_unused_password_resets(conn: connection, user_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE password_resets
            SET used_at = NOW()
            WHERE user_id = %s AND used_at IS NULL
            """,
            (str(user_id),),
        )


def create_password_reset(
    conn: connection,
    *,
    user_id: str | UUID,
    token_hash: str,
    expires_at: datetime,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO password_resets (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (str(user_id), token_hash, expires_at),
        )


def get_password_reset(conn: connection, token_hash: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, token_hash, expires_at, created_at, used_at
            FROM password_resets
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "token_hash": row[2],
        "expires_at": row[3],
        "created_at": row[4],
        "used_at": row[5],
    }


def mark_password_reset_used(conn: connection, reset_id: str | UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE password_resets
            SET used_at = NOW()
            WHERE id = %s AND used_at IS NULL
            RETURNING id
            """,
            (str(reset_id),),
        )
        return cur.fetchone() is not None
