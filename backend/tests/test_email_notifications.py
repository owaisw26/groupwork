import pytest

from app.services import notifications as notification_service


@pytest.fixture
def email_outbox(monkeypatch):
    outbox: list[dict[str, str]] = []

    def fake_send_email(to: str, subject: str, html_body: str) -> None:
        outbox.append({"to": to, "subject": subject, "body": html_body})

    monkeypatch.setattr("app.utils.email.send_email", fake_send_email)
    monkeypatch.setattr("app.services.notifications.send_email", fake_send_email)
    return outbox


def _create_user(db_conn, email: str) -> str:
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name, email_verified)
            VALUES (%s, 'hash', 'Email User', TRUE)
            RETURNING id
            """,
            (email,),
        )
        user_id = cur.fetchone()[0]
    db_conn.commit()
    return str(user_id)


NOTIFICATION_CASES = [
    ("invitation", "Project invitation", "You were invited to Capstone"),
    ("task_assigned", "Task assigned", "You were assigned a task"),
    ("task_completed", "Verification needed", "A task needs verification"),
    ("dispute_filed", "Dispute filed", "A dispute was filed"),
    ("peer_review", "Peer review opened", "Peer review has started"),
    ("report_ready", "Report ready", "Your contribution report is ready"),
    ("deadline_reminder", "Deadline approaching", "A task is due in 24 hours"),
]


@pytest.mark.parametrize("notification_type,title,message", NOTIFICATION_CASES)
def test_notification_email_sent_for_each_type(
    auth_client, db_conn, email_outbox, notification_type, title, message
):
    user_id = _create_user(db_conn, f"{notification_type}@example.com")

    notification_service.notify(
        db_conn,
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        entity_type="project",
        entity_id="00000000-0000-0000-0000-000000000001",
        recipient_email=f"{notification_type}@example.com",
    )

    assert len(email_outbox) == 1
    assert email_outbox[0]["to"] == f"{notification_type}@example.com"
    assert title in email_outbox[0]["subject"] or title in email_outbox[0]["body"]
    assert message in email_outbox[0]["body"]


def test_notification_email_respects_disabled_preference(auth_client, db_conn, email_outbox):
    user_id = _create_user(db_conn, "prefs-off@example.com")
    notification_service.update_preference(
        db_conn,
        user_id,
        notification_type="task_assigned",
        email_enabled=False,
    )

    notification_service.notify(
        db_conn,
        user_id=user_id,
        notification_type="task_assigned",
        title="Task assigned",
        message="Assigned task",
        recipient_email="prefs-off@example.com",
    )

    assert email_outbox == []


def test_notification_email_failure_does_not_raise(auth_client, db_conn, monkeypatch):
    user_id = _create_user(db_conn, "fail-email@example.com")

    def boom(*_args, **_kwargs):
        raise RuntimeError("SES unavailable")

    monkeypatch.setattr("app.services.notifications.send_email", boom)

    notification = notification_service.notify(
        db_conn,
        user_id=user_id,
        notification_type="report_ready",
        title="Report ready",
        message="Report generated",
        recipient_email="fail-email@example.com",
    )

    assert notification["type"] == "report_ready"
