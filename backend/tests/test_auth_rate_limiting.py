from tests.auth_helpers import extract_token_from_email, login_user, register_user


def _verified_session(client, email_outbox, email="refresh-limit@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email=email)


def _verified_user(client, email_outbox, email="ratelimit@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})


def test_sixth_login_attempt_within_minute_returns_429(auth_client, email_outbox):
    _verified_user(auth_client, email_outbox)

    for _ in range(5):
        login_user(auth_client, email="ratelimit@example.com", password="WrongPass1")

    response = login_user(auth_client, email="ratelimit@example.com", password="WrongPass1")

    assert response.status_code == 429


def test_eleventh_refresh_within_minute_returns_429(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    for _ in range(10):
        response = auth_client.post("/api/v1/auth/refresh")
        assert response.status_code == 200

    response = auth_client.post("/api/v1/auth/refresh")
    assert response.status_code == 429
