from datetime import datetime, timedelta, timezone

import psycopg2
from fastapi import HTTPException, status
from jose import JWTError
from psycopg2.extensions import connection

from app.config import get_settings
from app.db.queries import tokens as token_queries
from app.db.queries import users as user_queries
from app.utils import email as email_utils
from app.utils.security import (
    INVALID_CREDENTIALS_MSG,
    create_access_token,
    decode_token,
    generate_csrf_token,
    generate_token,
    hash_password,
    hash_token,
    normalize_email,
    validate_password_strength,
    verify_password_constant_time,
)

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
INVALID_RESET_TOKEN_MSG = "Invalid or expired reset token"


def register_user(
    conn: connection,
    *,
    email: str,
    password: str,
    full_name: str,
) -> dict:
    errors = validate_password_strength(password)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors,
        )

    email = normalize_email(email)

    if user_queries.get_user_by_email(conn, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    try:
        user = user_queries.create_user(
            conn,
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
        )
    except psycopg2.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None

    settings = get_settings()
    if settings.REQUIRE_EMAIL_VERIFICATION:
        raw_token = generate_token()
        token_queries.create_email_verification(
            conn,
            user_id=user["id"],
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        email_utils.send_email(
            to=email,
            subject="Verify your FairShare account",
            html_body=email_utils.verification_email_body(raw_token),
        )
    else:
        user_queries.update_email_verified(conn, user["id"])
        user["email_verified"] = True

    return user_queries.public_user(user)


def verify_email(conn: connection, token: str) -> dict:
    verification = token_queries.get_email_verification(conn, hash_token(token))
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
        )

    if verification["verified_at"] is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )

    if verification["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token expired",
        )

    user_queries.update_email_verified(conn, verification["user_id"])
    user_queries.reset_failed_logins(conn, verification["user_id"])
    token_queries.mark_email_verified(conn, verification["id"])
    user = user_queries.get_user_by_id(conn, verification["user_id"])
    return {"email_verified": True, "email": user["email"]}


def _check_lockout(user: dict) -> None:
    locked_until = user.get("locked_until")
    if locked_until and locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to failed login attempts",
        )


def login_user(conn: connection, *, email: str, password: str) -> tuple[dict, str, str, str]:
    email = normalize_email(email)
    user = user_queries.get_user_by_email(conn, email)

    if user:
        _check_lockout(user)

    password_valid = verify_password_constant_time(
        password,
        user["password_hash"] if user else None,
    )

    if not user or not password_valid:
        if user:
            failures = user_queries.increment_failed_logins(conn, user["id"])
            if failures >= LOCKOUT_THRESHOLD:
                user_queries.lock_account(
                    conn,
                    user["id"],
                    datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES),
                )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_MSG,
        )

    settings = get_settings()
    if settings.REQUIRE_EMAIL_VERIFICATION and not user["email_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )
    if not user["email_verified"]:
        user_queries.update_email_verified(conn, user["id"])
        user["email_verified"] = True

    user_queries.reset_failed_logins(conn, user["id"])
    token_queries.revoke_all_user_tokens(conn, user["id"])
    user["token_version"] = user_queries.increment_token_version(conn, user["id"])
    return _issue_session(conn, user)


def _issue_session(conn: connection, user: dict) -> tuple[dict, str, str, str]:
    settings = get_settings()
    access_token = create_access_token(str(user["id"]), user["token_version"])
    refresh_token = generate_token()
    csrf_token = generate_csrf_token()

    token_queries.create_refresh_token(
        conn,
        user_id=user["id"],
        token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_TTL),
    )

    return user_queries.public_user(user), access_token, refresh_token, csrf_token


def refresh_session(conn: connection, refresh_token: str) -> tuple[str, str, str]:
    token_hash = hash_token(refresh_token)
    token_record = token_queries.try_consume_refresh_token(conn, token_hash)
    if not token_record:
        existing = token_queries.get_refresh_token(conn, token_hash)
        if existing and existing["revoked"]:
            token_queries.revoke_all_user_tokens(conn, existing["user_id"])
            user_queries.increment_token_version(conn, existing["user_id"])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = user_queries.get_user_by_id(conn, token_record["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    _check_lockout(user)

    settings = get_settings()
    if settings.REQUIRE_EMAIL_VERIFICATION and not user["email_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )

    new_refresh_token = generate_token()
    token_queries.create_refresh_token(
        conn,
        user_id=user["id"],
        token_hash=hash_token(new_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_REFRESH_TTL),
    )

    access_token = create_access_token(str(user["id"]), user["token_version"])
    csrf_token = generate_csrf_token()
    return access_token, new_refresh_token, csrf_token


def _user_id_from_access_token(access_token: str | None) -> str | None:
    if not access_token:
        return None
    try:
        payload = decode_token(access_token)
        if payload.get("type") != "access":
            return None
        return payload["sub"]
    except JWTError:
        return None


def logout_user(
    conn: connection,
    refresh_token: str | None,
    access_token: str | None = None,
) -> None:
    user_id = _user_id_from_access_token(access_token)

    if refresh_token:
        token_record = token_queries.get_refresh_token(conn, hash_token(refresh_token))
        if token_record:
            user_id = user_id or str(token_record["user_id"])
        token_queries.revoke_refresh_token(conn, hash_token(refresh_token))

    if user_id:
        user_queries.increment_token_version(conn, user_id)


def forgot_password(conn: connection, email: str) -> None:
    email = normalize_email(email)
    user = user_queries.get_user_by_email(conn, email)
    if not user:
        return

    raw_token = generate_token()
    token_queries.invalidate_unused_password_resets(conn, user["id"])
    token_queries.create_password_reset(
        conn,
        user_id=user["id"],
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    email_utils.send_email(
        to=email,
        subject="Reset your FairShare password",
        html_body=email_utils.password_reset_email_body(raw_token),
    )


def reset_password(conn: connection, *, token: str, password: str) -> None:
    errors = validate_password_strength(password)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors,
        )

    reset_record = token_queries.get_password_reset(conn, hash_token(token))
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_RESET_TOKEN_MSG,
        )

    if reset_record["used_at"] is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_RESET_TOKEN_MSG,
        )

    if reset_record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_RESET_TOKEN_MSG,
        )

    if not token_queries.mark_password_reset_used(conn, reset_record["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_RESET_TOKEN_MSG,
        )

    user_queries.update_password(conn, reset_record["user_id"], hash_password(password))
    user_queries.reset_failed_logins(conn, reset_record["user_id"])
    token_queries.revoke_all_user_tokens(conn, reset_record["user_id"])
    user_queries.increment_token_version(conn, reset_record["user_id"])
