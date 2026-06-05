from tests.auth_helpers import auth_headers, extract_token_from_email, login_user, register_user


def _verified_session(client, email_outbox):
    register_user(client, email="csrf@example.com")
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email="csrf@example.com")


def test_post_without_csrf_token_returns_403(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    response = auth_client.put(
        "/api/v1/users/me",
        json={"full_name": "No CSRF"},
    )

    assert response.status_code == 403


def test_put_without_csrf_token_returns_403(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    response = auth_client.put(
        "/api/v1/users/me",
        json={"full_name": "Still No CSRF"},
    )

    assert response.status_code == 403


def test_post_logout_without_csrf_token_returns_403(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    response = auth_client.post("/api/v1/auth/logout")

    assert response.status_code == 403


def test_get_does_not_require_csrf(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    response = auth_client.get("/api/v1/users/me")

    assert response.status_code == 200


def test_post_with_valid_csrf_succeeds(auth_client, email_outbox):
    _verified_session(auth_client, email_outbox)

    response = auth_client.put(
        "/api/v1/users/me",
        json={"full_name": "With CSRF"},
        headers=auth_headers(auth_client),
    )

    assert response.status_code == 200
