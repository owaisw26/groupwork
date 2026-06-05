from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_user(
    conn: connection,
    *,
    email: str,
    password_hash: str,
    full_name: str,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name)
            VALUES (%s, %s, %s)
            RETURNING id, email, password_hash, full_name, email_verified, created_at,
                      failed_login_attempts, locked_until, has_completed_onboarding
            """,
            (email, password_hash, full_name),
        )
        row = cur.fetchone()
    return _row_to_user(row)


def get_user_by_email(conn: connection, email: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, password_hash, full_name, email_verified, created_at,
                   failed_login_attempts, locked_until, has_completed_onboarding
            FROM users
            WHERE email = %s
            """,
            (email,),
        )
        row = cur.fetchone()
    return _row_to_user(row) if row else None


def get_user_by_id(conn: connection, user_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, password_hash, full_name, email_verified, created_at,
                   failed_login_attempts, locked_until, has_completed_onboarding
            FROM users
            WHERE id = %s
            """,
            (str(user_id),),
        )
        row = cur.fetchone()
    return _row_to_user(row) if row else None


def update_email_verified(conn: connection, user_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET email_verified = TRUE WHERE id = %s",
            (str(user_id),),
        )


def update_password(conn: connection, user_id: str | UUID, password_hash: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, str(user_id)),
        )


def update_profile(
    conn: connection,
    user_id: str | UUID,
    *,
    full_name: str | None = None,
    has_completed_onboarding: bool | None = None,
) -> dict[str, Any]:
    updates: list[str] = []
    params: list[object] = []

    if full_name is not None:
        updates.append("full_name = %s")
        params.append(full_name)
    if has_completed_onboarding is not None:
        updates.append("has_completed_onboarding = %s")
        params.append(has_completed_onboarding)

    if not updates:
        user = get_user_by_id(conn, user_id)
        if not user:
            raise ValueError("User not found")
        return user

    params.append(str(user_id))
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE users SET {", ".join(updates)}
            WHERE id = %s
            RETURNING id, email, password_hash, full_name, email_verified, created_at,
                      failed_login_attempts, locked_until, has_completed_onboarding
            """,
            tuple(params),
        )
        row = cur.fetchone()
    return _row_to_user(row)


def increment_failed_logins(conn: connection, user_id: str | UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET failed_login_attempts = failed_login_attempts + 1
            WHERE id = %s
            RETURNING failed_login_attempts
            """,
            (str(user_id),),
        )
        return cur.fetchone()[0]


def reset_failed_logins(conn: connection, user_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET failed_login_attempts = 0, locked_until = NULL
            WHERE id = %s
            """,
            (str(user_id),),
        )


def lock_account(conn: connection, user_id: str | UUID, locked_until: datetime) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET locked_until = %s WHERE id = %s",
            (locked_until, str(user_id)),
        )


def _row_to_user(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "email": row[1],
        "password_hash": row[2],
        "full_name": row[3],
        "email_verified": row[4],
        "created_at": row[5],
        "failed_login_attempts": row[6],
        "locked_until": row[7],
        "has_completed_onboarding": row[8],
    }


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user["id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "email_verified": user["email_verified"],
        "has_completed_onboarding": user["has_completed_onboarding"],
        "created_at": user["created_at"].isoformat(),
    }
