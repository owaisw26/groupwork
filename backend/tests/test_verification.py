import pytest

from tests.task_helpers import (
    add_project_member,
    create_project,
    create_task,
    switch_user,
    verified_user,
)


def _setup_three_member_project(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="verify-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    member_one_headers, member_one_email = verified_user(
        auth_client, email_outbox, email="verify-member1@example.com"
    )
    member_two_headers, member_two_email = verified_user(
        auth_client, email_outbox, email="verify-member2@example.com"
    )
    add_project_member(db_conn, project["id"], member_one_email)
    add_project_member(db_conn, project["id"], member_two_email)
    return {
        "owner_headers": switch_user(auth_client, "verify-owner@example.com"),
        "member_one_headers": member_one_headers,
        "member_two_headers": switch_user(auth_client, "verify-member2@example.com"),
        "project": project,
    }


def _mark_task_done(auth_client, headers, task_id):
    return auth_client.patch(
        f"/api/v1/tasks/{task_id}/status",
        json={"status": "done"},
        headers=headers,
    )


def test_moving_task_to_done_triggers_verification_state(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
        title="Done task",
    ).json()

    response = _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    assert response.status_code == 200
    assert response.json()["verification_status"] == "pending"


def test_member_can_verify(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["member_one_headers"],
    )

    assert response.status_code == 200
    assert response.json()["status"] == "verified"


def test_cannot_verify_own_task(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["owner_headers"],
    )

    assert response.status_code == 403


def test_cannot_verify_twice(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["member_one_headers"],
    )
    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["member_one_headers"],
    )

    assert response.status_code == 409


def test_task_verified_when_majority_verify(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["member_one_headers"],
    )
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["member_two_headers"],
    )

    task_response = auth_client.get(
        f"/api/v1/tasks/{task['id']}",
        headers=ctx["owner_headers"],
    )
    assert task_response.json()["verification_status"] == "verified"


def test_dispute_creates_dispute_record(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": "Work was not actually completed"},
        headers=ctx["member_one_headers"],
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
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": "Insufficient evidence"},
        headers=ctx["member_one_headers"],
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
    _mark_task_done(auth_client, owner_headers, task["id"])

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
    task = create_task(
        auth_client,
        ctx["owner_headers"],
        ctx["project"]["id"],
    ).json()
    _mark_task_done(auth_client, ctx["owner_headers"], task["id"])
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/verify",
        headers=ctx["member_one_headers"],
    )

    response = auth_client.get(
        f"/api/v1/tasks/{task['id']}/verifications",
        headers=ctx["owner_headers"],
    )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["status"] == "verified"
