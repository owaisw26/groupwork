from datetime import datetime, timedelta, timezone

from tests.auth_helpers import extract_token_from_email, login_user, register_user


def _verified_user(client, email_outbox, email="lockout@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})


def test_account_lockout_after_five_failures(auth_client, email_outbox):
    _verified_user(auth_client, email_outbox)

    for _ in range(5):
        login_user(auth_client, email="lockout@example.com", password="WrongPass1")

    response = login_user(auth_client, email="lockout@example.com", password="Password1")

    assert response.status_code == 429


def test_lockout_expires_after_fifteen_minutes(auth_client, email_outbox, db_conn):
    _verified_user(auth_client, email_outbox)

    for _ in range(5):
        login_user(auth_client, email="lockout@example.com", password="WrongPass1")

    with db_conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET locked_until = %s, failed_login_attempts = 5",
            (datetime.now(timezone.utc) - timedelta(minutes=1),),
        )
    db_conn.commit()

    response = login_user(auth_client, email="lockout@example.com", password="Password1")

    assert response.status_code == 200
