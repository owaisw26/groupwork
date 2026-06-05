from tests.auth_helpers import (
    DEFAULT_PASSWORD,
    auth_headers,
    extract_token_from_email,
    login_user,
    register_user,
)


def _verified_session(client, email_outbox, email="security@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email=email)


def test_access_token_invalid_after_logout(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)
    headers = auth_headers(auth_client)

    auth_client.post("/api/v1/auth/logout", headers=headers)

    response = auth_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401


def test_access_token_invalid_after_password_reset(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox, email="reset-access@example.com")
    headers = auth_headers(auth_client)

    auth_client.post("/api/v1/auth/forgot-password", json={"email": "reset-access@example.com"})
    reset_token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewPassword2"},
    )

    response = auth_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401


def test_verify_email_clears_lockout(auth_client, email_outbox):
    register_user(auth_client, email="locked-unverified@example.com")

    for _ in range(5):
        login_user(auth_client, email="locked-unverified@example.com", password="WrongPass1")

    token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    from app.middleware.rate_limit import limiter

    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()

    response = login_user(auth_client, email="locked-unverified@example.com")
    assert response.status_code == 200


def test_refresh_rotates_refresh_token(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox, email="rotate@example.com")
    old_refresh = auth_client.cookies.get("refresh_token")

    response = auth_client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    assert auth_client.cookies.get("refresh_token") != old_refresh


def test_login_invalidates_prior_access_token(auth_client, email_outbox, db_conn):
    _verified_session(auth_client, email_outbox, email="relogin@example.com")
    old_access = auth_client.cookies.get("access_token")
    headers = auth_headers(auth_client)

    from app.middleware.rate_limit import limiter

    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()

    login_user(auth_client, email="relogin@example.com")

    auth_client.cookies.set("access_token", old_access)
    response = auth_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401


def test_logout_invalidates_access_without_refresh_cookie(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox, email="logout-no-refresh@example.com")
    access_token = auth_client.cookies.get("access_token")
    csrf_token = auth_client.cookies.get("csrf_token")
    headers = auth_headers(auth_client)

    auth_client.cookies.clear()
    auth_client.cookies.set("access_token", access_token)
    auth_client.cookies.set("csrf_token", csrf_token)
    auth_client.post("/api/v1/auth/logout", headers=headers)

    auth_client.cookies.set("access_token", access_token)
    response = auth_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401


def test_email_case_insensitive_login(auth_client, email_outbox):
    register_user(auth_client, email="case@example.com")
    token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    response = login_user(auth_client, email="CASE@example.com")
    assert response.status_code == 200


def test_old_refresh_token_fails_after_rotation(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox, email="rotate2@example.com")
    old_refresh = auth_client.cookies.get("refresh_token")

    auth_client.post("/api/v1/auth/refresh")
    auth_client.cookies.set("refresh_token", old_refresh)

    response = auth_client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
