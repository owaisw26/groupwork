from tests.auth_helpers import extract_token_from_email, login_user, register_user


def _verified_session(client, email_outbox, email="refresh@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email=email)


def test_valid_refresh_returns_new_access_token(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)
    old_access = auth_client.cookies.get("access_token")

    response = auth_client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    assert auth_client.cookies.get("access_token")
    assert auth_client.cookies.get("access_token") != old_access


def test_expired_refresh_returns_401(auth_client, email_outbox, db_conn):
    _verified_session(auth_client, email_outbox)

    with db_conn.cursor() as cur:
        cur.execute("UPDATE refresh_tokens SET expires_at = NOW() - INTERVAL '1 day'")
    db_conn.commit()

    response = auth_client.post("/api/v1/auth/refresh")

    assert response.status_code == 401


def test_revoked_refresh_returns_401(auth_client, email_outbox, db_conn):
    _verified_session(auth_client, email_outbox)

    with db_conn.cursor() as cur:
        cur.execute("UPDATE refresh_tokens SET revoked = TRUE")
    db_conn.commit()

    response = auth_client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
