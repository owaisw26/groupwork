from tests.auth_helpers import extract_token_from_email, register_user
from tests.task_helpers import (
    add_project_member,
    create_project,
    create_task,
    switch_user,
    verified_user,
)


def _register_and_verify(auth_client, email_outbox, email: str) -> None:
    register_user(auth_client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post("/api/v1/auth/verify-email", json={"token": token})


def _clear_rate_limit() -> None:
    from app.middleware.rate_limit import limiter

    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()


def _setup_two_member_project(auth_client, email_outbox, db_conn):
    owner_email = "lifecycle-owner@example.com"
    member_email = "lifecycle-member@example.com"

    owner_headers, _ = verified_user(auth_client, email_outbox, email=owner_email)
    project = create_project(auth_client, owner_headers).json()

    _register_and_verify(auth_client, email_outbox, member_email)
    add_project_member(db_conn, project["id"], member_email)

    return {
        "owner_email": owner_email,
        "member_email": member_email,
        "project": project,
    }


def _owner_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["owner_email"])


def _member_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["member_email"])


def _set_project_lifecycle_status(
    db_conn,
    project_id: str,
    *,
    status: str,
    with_completed_at: bool = False,
    with_peer_review_deadline: bool = False,
    with_report_key: bool = False,
):
    with db_conn.cursor() as cur:
        cur.execute(
            """
            UPDATE projects
            SET status = %s,
                completed_at = CASE WHEN %s THEN NOW() ELSE completed_at END,
                peer_review_ends_at = CASE
                    WHEN %s THEN NOW() + INTERVAL '7 days'
                    ELSE peer_review_ends_at
                END,
                report_s3_key = CASE WHEN %s THEN 'reports/manual.pdf' ELSE report_s3_key END
            WHERE id = %s
            """,
            (status, with_completed_at, with_peer_review_deadline, with_report_key, project_id),
        )
    db_conn.commit()


def _count_notifications(db_conn, user_email: str, notification_type: str) -> int:
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM notifications n
            JOIN users u ON u.id = n.user_id
            WHERE u.email = %s AND n.type = %s
            """,
            (user_email, notification_type),
        )
        return cur.fetchone()[0]


def test_complete_project_owner_can_transition_to_peer_review(
    auth_client, email_outbox, db_conn
):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/complete",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "peer_review"

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT completed_at, peer_review_ends_at FROM projects WHERE id = %s",
            (ctx["project"]["id"],),
        )
        completed_at, peer_review_ends_at = cur.fetchone()
    assert completed_at is not None
    assert peer_review_ends_at is not None


def test_complete_project_not_owner_returns_403(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/complete",
        headers=_member_headers(auth_client, ctx),
    )

    assert response.status_code == 403


def test_complete_project_notifies_members(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/complete",
        headers=_owner_headers(auth_client, ctx),
    )

    assert _count_notifications(db_conn, ctx["member_email"], "peer_review") >= 1


def test_complete_project_cannot_transition_backwards(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)
    _set_project_lifecycle_status(
        db_conn,
        ctx["project"]["id"],
        status="peer_review",
        with_completed_at=True,
        with_peer_review_deadline=True,
    )

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/complete",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 409


def test_generate_report_peer_review_to_report_generated(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)
    _set_project_lifecycle_status(
        db_conn,
        ctx["project"]["id"],
        status="peer_review",
        with_completed_at=True,
        with_peer_review_deadline=True,
    )

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/generate-report",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "report_generated"

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT report_s3_key FROM projects WHERE id = %s",
            (ctx["project"]["id"],),
        )
        report_s3_key = cur.fetchone()[0]
    assert report_s3_key is not None


def test_generate_report_requires_peer_review_state(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/generate-report",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 409


def test_archive_project_report_generated_to_archived(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)
    _set_project_lifecycle_status(
        db_conn,
        ctx["project"]["id"],
        status="report_generated",
        with_completed_at=True,
        with_peer_review_deadline=True,
        with_report_key=True,
    )

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/archive",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "archived"

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT archived_at FROM projects WHERE id = %s",
            (ctx["project"]["id"],),
        )
        archived_at = cur.fetchone()[0]
    assert archived_at is not None


def test_task_create_blocked_in_peer_review(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)
    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/complete",
        headers=_owner_headers(auth_client, ctx),
    )

    response = create_task(
        auth_client,
        _owner_headers(auth_client, ctx),
        ctx["project"]["id"],
        title="Should fail",
    )

    assert response.status_code == 409


def test_task_update_blocked_in_report_generated(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        _owner_headers(auth_client, ctx),
        ctx["project"]["id"],
        title="Before lock",
    ).json()
    _set_project_lifecycle_status(
        db_conn,
        ctx["project"]["id"],
        status="report_generated",
        with_completed_at=True,
        with_peer_review_deadline=True,
        with_report_key=True,
    )

    response = auth_client.put(
        f"/api/v1/tasks/{task['id']}",
        json={"title": "After lock"},
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 409


def test_task_delete_blocked_in_archived(auth_client, email_outbox, db_conn):
    ctx = _setup_two_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        _owner_headers(auth_client, ctx),
        ctx["project"]["id"],
        title="Delete lock",
    ).json()
    _set_project_lifecycle_status(
        db_conn,
        ctx["project"]["id"],
        status="archived",
        with_completed_at=True,
        with_peer_review_deadline=True,
        with_report_key=True,
    )

    response = auth_client.delete(
        f"/api/v1/tasks/{task['id']}",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 409
