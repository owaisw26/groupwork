from tests.auth_helpers import extract_token_from_email, login_user, register_user


def _register_and_verify(client, email_outbox, email="login@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})


def test_valid_login_returns_200_and_sets_cookies(auth_client, email_outbox):
    _register_and_verify(auth_client, email_outbox)
    response = login_user(auth_client, email="login@example.com")

    assert response.status_code == 200
    assert auth_client.cookies.get("access_token")
    assert auth_client.cookies.get("refresh_token")
    assert auth_client.cookies.get("csrf_token")


def test_wrong_password_returns_401(auth_client, email_outbox):
    _register_and_verify(auth_client, email_outbox)
    response = login_user(auth_client, email="login@example.com", password="WrongPass1")

    assert response.status_code == 401


def test_nonexistent_email_returns_401_same_message(auth_client, email_outbox):
    _register_and_verify(auth_client, email_outbox)
    wrong = login_user(auth_client, email="nobody@example.com", password="Password1")
    bad_pass = login_user(auth_client, email="login@example.com", password="WrongPass1")

    assert wrong.status_code == 401
    assert bad_pass.status_code == 401
    assert wrong.json()["error"]["message"] == bad_pass.json()["error"]["message"]


def test_unverified_account_returns_403(auth_client):
    register_user(auth_client, email="notverified@example.com")
    response = login_user(auth_client, email="notverified@example.com")

    assert response.status_code == 403
