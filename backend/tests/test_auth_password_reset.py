from tests.auth_helpers import (
    DEFAULT_PASSWORD,
    extract_token_from_email,
    login_user,
    register_user,
)


def _verified_user(client, email_outbox, email="reset@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})


def test_forgot_password_returns_200_for_valid_email(auth_client, email_outbox):
    _verified_user(auth_client, email_outbox, email="reset@example.com")

    response = auth_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com"},
    )

    assert response.status_code == 200
    assert len(email_outbox) == 2


def test_forgot_password_returns_200_for_unknown_email(auth_client):
    response = auth_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "unknown@example.com"},
    )

    assert response.status_code == 200


def test_forgot_password_invalid_email_returns_422(auth_client):
    response = auth_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "not-an-email"},
    )

    assert response.status_code == 422


def test_reset_password_with_valid_token(auth_client, email_outbox):
    _verified_user(auth_client, email_outbox, email="reset@example.com")
    auth_client.post("/api/v1/auth/forgot-password", json={"email": "reset@example.com"})
    reset_token = extract_token_from_email(email_outbox[-1]["body"])

    response = auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewPassword2"},
    )

    assert response.status_code == 200
    login = login_user(auth_client, email="reset@example.com", password="NewPassword2")
    assert login.status_code == 200


def test_reset_password_expired_token_fails(auth_client, email_outbox, db_conn):
    _verified_user(auth_client, email_outbox, email="reset2@example.com")
    auth_client.post("/api/v1/auth/forgot-password", json={"email": "reset2@example.com"})
    reset_token = extract_token_from_email(email_outbox[-1]["body"])

    with db_conn.cursor() as cur:
        cur.execute("UPDATE password_resets SET expires_at = NOW() - INTERVAL '2 hours'")
    db_conn.commit()

    response = auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewPassword2"},
    )

    assert response.status_code == 400


def test_reset_password_used_token_fails(auth_client, email_outbox):
    _verified_user(auth_client, email_outbox, email="reset3@example.com")
    auth_client.post("/api/v1/auth/forgot-password", json={"email": "reset3@example.com"})
    reset_token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewPassword2"},
    )

    response = auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "AnotherPass3"},
    )

    assert response.status_code == 400


def test_reset_password_revokes_old_sessions(auth_client, email_outbox, db_conn):
    _verified_user(auth_client, email_outbox, email="reset4@example.com")
    login_user(auth_client, email="reset4@example.com", password=DEFAULT_PASSWORD)
    auth_client.post("/api/v1/auth/forgot-password", json={"email": "reset4@example.com"})
    reset_token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewPassword2"},
    )

    response = auth_client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
