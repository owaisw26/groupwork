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


def _setup_three_member_project(auth_client, email_outbox, db_conn):
    owner_email = "verify-owner@example.com"
    member_one_email = "verify-member1@example.com"
    member_two_email = "verify-member2@example.com"

    owner_headers, _ = verified_user(auth_client, email_outbox, email=owner_email)
    project = create_project(auth_client, owner_headers).json()

    _register_and_verify(auth_client, email_outbox, member_one_email)
    _register_and_verify(auth_client, email_outbox, member_two_email)
    add_project_member(db_conn, project["id"], member_one_email)
    add_project_member(db_conn, project["id"], member_two_email)

    return {
        "owner_email": owner_email,
        "member_one_email": member_one_email,
        "member_two_email": member_two_email,
        "project": project,
    }


def _owner_headers(auth_client, ctx):
    return switch_user(auth_client, ctx["owner_email"])


def _member_one_headers(auth_client, ctx):
    return switch_user(auth_client, ctx["member_one_email"])


def _member_two_headers(auth_client, ctx):
    return switch_user(auth_client, ctx["member_two_email"])


def _create_task_checked(auth_client, headers, project_id, **overrides):
    response = create_task(auth_client, headers, project_id, **overrides)
    assert response.status_code == 201, response.json()
    return response.json()


def _mark_task_review(auth_client, headers, task_id):
    return auth_client.patch(
        f"/api/v1/tasks/{task_id}/status",
        json={"status": "review"},
        headers=headers,
    )


def test_moving_task_to_review_triggers_verification_state(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(
        auth_client,
        _owner_headers(auth_client, ctx),
        ctx["project"]["id"],
        title="Done task",
    )

    response = _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    assert response.status_code == 200
    assert response.json()["status"] == "review"
    assert response.json()["verification_status"] == "pending"


def test_cannot_move_unverified_review_task_to_done(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    response = auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 409
    assert (
        response.json()["error"]["message"]
        == "Task must be verified by another member before it can be moved to done"
    )


def test_member_can_verify(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_member_one_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "verified"


def test_cannot_verify_own_task(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 403


def test_cannot_verify_twice(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    member_headers = _member_one_headers(auth_client, ctx)
    auth_client.post(f"/api/v1/tasks/{task['id']}/verify", headers=member_headers)
    response = auth_client.post(f"/api/v1/tasks/{task['id']}/verify", headers=member_headers)

    assert response.status_code == 409


def test_task_verified_when_majority_verify(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_member_one_headers(auth_client, ctx),
    )
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_member_two_headers(auth_client, ctx),
    )

    task_response = auth_client.get(
        f"/api/v1/tasks/{task['id']}",
        headers=_owner_headers(auth_client, ctx),
    )
    assert task_response.json()["verification_status"] == "verified"


def test_verified_review_task_can_move_to_done(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_member_one_headers(auth_client, ctx),
    )
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_member_two_headers(auth_client, ctx),
    )

    response = auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["verification_status"] == "verified"


def test_dispute_creates_dispute_record(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": "Work was not actually completed"},
        headers=_member_one_headers(auth_client, ctx),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["reason"] == "Work was not actually completed"
    assert data["status"] == "open"

    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM disputes WHERE task_id = %s", (task["id"],))
        assert cur.fetchone()[0] == 1


def test_dispute_triggers_notification(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": "Insufficient evidence"},
        headers=_member_one_headers(auth_client, ctx),
    )

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM notifications
            WHERE type = 'dispute_filed' AND related_entity_id = %s
            """,
            (task["id"],),
        )
        assert cur.fetchone()[0] >= 1


def test_non_member_cannot_verify(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="verify-outsider-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()
    _mark_task_review(auth_client, owner_headers, task["id"])

    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="verify-outsider@example.com"
    )
    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=outsider_headers,
    )

    assert response.status_code == 403


def test_get_task_verifications(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_task_checked(auth_client, _owner_headers(auth_client, ctx), ctx["project"]["id"])
    _mark_task_review(auth_client, _owner_headers(auth_client, ctx), task["id"])
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=_member_one_headers(auth_client, ctx),
    )

    response = auth_client.get(
        f"/api/v1/tasks/{task['id']}/verifications",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["status"] == "verified"
