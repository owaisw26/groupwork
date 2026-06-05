from tests.auth_helpers import auth_headers, extract_token_from_email, login_user, register_user


def _verified_session(client, email_outbox):
    register_user(client, email="logout@example.com")
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email="logout@example.com")


def test_logout_clears_cookies(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    response = auth_client.post("/api/v1/auth/logout", headers=auth_headers(auth_client))

    assert response.status_code == 200
    assert not auth_client.cookies.get("access_token")
    assert not auth_client.cookies.get("refresh_token")


def test_logout_revokes_refresh_token(auth_client, email_outbox, db_conn):
    _verified_session(auth_client, email_outbox)
    auth_client.post("/api/v1/auth/logout", headers=auth_headers(auth_client))

    with db_conn.cursor() as cur:
        cur.execute("SELECT revoked FROM refresh_tokens")
        revoked = cur.fetchone()[0]

    assert revoked is True


def test_old_refresh_token_fails_after_logout(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)
    auth_client.post("/api/v1/auth/logout", headers=auth_headers(auth_client))

    response = auth_client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
