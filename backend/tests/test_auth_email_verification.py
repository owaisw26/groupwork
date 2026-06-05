from datetime import datetime, timedelta, timezone

from tests.auth_helpers import extract_token_from_email, register_user


def _get_verification_token(email_outbox) -> str:
    return extract_token_from_email(email_outbox[0]["body"])


def test_valid_token_verifies_account(auth_client, email_outbox):
    register_user(auth_client, email="verify@example.com")
    token = _get_verification_token(email_outbox)

    response = auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    assert response.status_code == 200
    assert response.json()["email_verified"] is True


def test_expired_token_returns_400(auth_client, email_outbox, db_conn):
    register_user(auth_client, email="expired@example.com")
    token = _get_verification_token(email_outbox)

    with db_conn.cursor() as cur:
        cur.execute(
            "UPDATE email_verifications SET expires_at = %s",
            (datetime.now(timezone.utc) - timedelta(hours=1),),
        )
    db_conn.commit()

    response = auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    assert response.status_code == 400


def test_invalid_token_returns_400(auth_client):
    response = auth_client.post(
        "/api/v1/auth/verify-email",
        json={"token": "totally-invalid-token"},
    )

    assert response.status_code == 400


def test_already_verified_returns_400(auth_client, email_outbox):
    register_user(auth_client, email="already@example.com")
    token = _get_verification_token(email_outbox)
    auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    response = auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    assert response.status_code == 400
