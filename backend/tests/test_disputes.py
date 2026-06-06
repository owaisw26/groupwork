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
    owner_email = "dispute-owner@example.com"
    member_one_email = "dispute-member1@example.com"
    member_two_email = "dispute-member2@example.com"

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


def _create_done_task(auth_client, ctx):
    task = create_task(
        auth_client,
        _owner_headers(auth_client, ctx),
        ctx["project"]["id"],
        title="Disputed task",
    ).json()
    auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=_owner_headers(auth_client, ctx),
    )
    return task


def _file_dispute(auth_client, ctx, task_id, *, reason="Work incomplete", as_member="member_one"):
    headers = (
        _member_one_headers(auth_client, ctx)
        if as_member == "member_one"
        else _member_two_headers(auth_client, ctx)
    )
    return auth_client.post(
        f"/api/v1/tasks/{task_id}/dispute",
        json={"reason": reason},
        headers=headers,
    )


def _vote(auth_client, ctx, dispute_id, vote, *, as_email):
    return auth_client.post(
        f"/api/v1/disputes/{dispute_id}/vote",
        json={"vote": vote},
        headers=switch_user(auth_client, as_email),
    )


def test_file_dispute_valid_returns_201(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)

    response = _file_dispute(auth_client, ctx, task["id"])

    assert response.status_code == 201
    data = response.json()
    assert data["reason"] == "Work incomplete"
    assert data["status"] == "open"
    assert data["outcome"] is None


def test_file_dispute_missing_reason_returns_422(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": ""},
        headers=_member_one_headers(auth_client, ctx),
    )

    assert response.status_code == 422


def test_file_dispute_non_member_returns_403(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="dispute-outsider@example.com"
    )

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": "Not valid"},
        headers=outsider_headers,
    )

    assert response.status_code == 403


def test_multiple_disputes_on_same_task_allowed(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)

    first = _file_dispute(auth_client, ctx, task["id"], reason="First dispute")
    second = _file_dispute(
        auth_client,
        ctx,
        task["id"],
        reason="Second dispute",
        as_member="member_two",
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]

    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM disputes WHERE task_id = %s", (task["id"],))
        assert cur.fetchone()[0] == 2


def test_member_can_cast_uphold_vote(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    response = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "uphold",
        as_email=ctx["owner_email"],
    )

    assert response.status_code == 200
    assert response.json()["vote"] == "uphold"


def test_member_can_cast_reject_vote(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    response = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "reject",
        as_email=ctx["member_two_email"],
    )

    assert response.status_code == 200
    assert response.json()["vote"] == "reject"


def test_vote_non_member_returns_403(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()
    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="dispute-vote-outsider@example.com"
    )

    response = auth_client.post(
        f"/api/v1/disputes/{dispute['id']}/vote",
        json={"vote": "uphold"},
        headers=outsider_headers,
    )

    assert response.status_code == 403


def test_cannot_vote_twice(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    first = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "uphold",
        as_email=ctx["owner_email"],
    )
    second = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "reject",
        as_email=ctx["owner_email"],
    )

    assert first.status_code == 200
    assert second.status_code == 409


def test_dispute_resolved_on_majority_uphold(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["owner_email"])
    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["member_one_email"])
    response = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "reject",
        as_email=ctx["member_two_email"],
    )

    assert response.json()["dispute"]["status"] == "resolved"
    assert response.json()["dispute"]["outcome"] == "upheld"


def test_dispute_resolved_on_majority_reject(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    _vote(auth_client, ctx, dispute["id"], "reject", as_email=ctx["owner_email"])
    _vote(auth_client, ctx, dispute["id"], "reject", as_email=ctx["member_two_email"])
    response = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "uphold",
        as_email=ctx["member_one_email"],
    )

    assert response.json()["dispute"]["status"] == "resolved"
    assert response.json()["dispute"]["outcome"] == "rejected"


def test_dispute_resolved_when_all_members_voted(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["owner_email"])
    _vote(auth_client, ctx, dispute["id"], "reject", as_email=ctx["member_two_email"])
    response = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "uphold",
        as_email=ctx["member_one_email"],
    )

    assert response.json()["dispute"]["status"] == "resolved"
    assert response.json()["dispute"]["outcome"] == "upheld"


def test_notification_sent_on_dispute_resolution(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["owner_email"])
    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["member_one_email"])
    _vote(auth_client, ctx, dispute["id"], "reject", as_email=ctx["member_two_email"])

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM notifications
            WHERE type = 'dispute_resolved' AND related_entity_id = %s
            """,
            (dispute["id"],),
        )
        assert cur.fetchone()[0] >= 1


def test_list_task_disputes_returns_history(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    _file_dispute(auth_client, ctx, task["id"], reason="First")
    _file_dispute(auth_client, ctx, task["id"], reason="Second", as_member="member_two")

    response = auth_client.get(
        f"/api/v1/tasks/{task['id']}/disputes",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 2
    assert {item["reason"] for item in items} == {"First", "Second"}


def test_cannot_vote_on_resolved_dispute(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    task = _create_done_task(auth_client, ctx)
    dispute = _file_dispute(auth_client, ctx, task["id"]).json()

    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["owner_email"])
    _vote(auth_client, ctx, dispute["id"], "uphold", as_email=ctx["member_one_email"])
    _vote(auth_client, ctx, dispute["id"], "reject", as_email=ctx["member_two_email"])

    response = _vote(
        auth_client,
        ctx,
        dispute["id"],
        "uphold",
        as_email=ctx["owner_email"],
    )

    assert response.status_code == 409
