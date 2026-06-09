from tests.auth_helpers import register_user


def test_valid_registration_returns_201(auth_client, email_outbox):
    response = register_user(auth_client, email="newuser@example.com")

    assert response.status_code == 201
    assert response.json()["email"] == "newuser@example.com"
    assert len(email_outbox) == 1


def test_registration_auto_verifies_when_email_verification_disabled(
    auth_client,
    email_outbox,
    monkeypatch,
):
    monkeypatch.setenv("REQUIRE_EMAIL_VERIFICATION", "false")
    from app.config import get_settings

    get_settings.cache_clear()

    response = register_user(auth_client, email="demo@example.com")

    assert response.status_code == 201
    assert response.json()["email_verified"] is True
    assert len(email_outbox) == 0


def test_duplicate_email_returns_409(auth_client):
    register_user(auth_client, email="dup@example.com")
    response = register_user(auth_client, email="dup@example.com")

    assert response.status_code == 409


def test_weak_password_missing_uppercase_returns_422(auth_client):
    response = register_user(auth_client, email="a@example.com", password="password1")

    assert response.status_code == 422


def test_weak_password_missing_lowercase_returns_422(auth_client):
    response = register_user(auth_client, email="b@example.com", password="PASSWORD1")

    assert response.status_code == 422


def test_weak_password_missing_digit_returns_422(auth_client):
    response = register_user(auth_client, email="c@example.com", password="Passwordd")

    assert response.status_code == 422


def test_weak_password_too_short_returns_422(auth_client):
    response = register_user(auth_client, email="d@example.com", password="Pass1")

    assert response.status_code == 422


def test_missing_fields_returns_422(auth_client):
    response = auth_client.post("/api/v1/auth/register", json={"email": "e@example.com"})

    assert response.status_code == 422


def test_unverified_user_cannot_access_protected_route(auth_client, db_conn):
    register_user(auth_client, email="unverified@example.com")

    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", ("unverified@example.com",))
        user_id = str(cur.fetchone()[0])

    from app.utils.security import create_access_token

    auth_client.cookies.set("access_token", create_access_token(user_id, 0))
    response = auth_client.get("/api/v1/users/me")

    assert response.status_code == 403
