from tests.auth_helpers import extract_token_from_email, register_user
from tests.task_helpers import (
    add_project_member,
    create_project,
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


def _setup_three_member_project(auth_client, email_outbox, db_conn):
    owner_email = "peer-owner@example.com"
    member_one_email = "peer-member1@example.com"
    member_two_email = "peer-member2@example.com"

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
    _clear_rate_limit()
    return switch_user(auth_client, ctx["owner_email"])


def _member_one_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["member_one_email"])


def _member_two_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["member_two_email"])


def _set_peer_review_status(db_conn, project_id):
    with db_conn.cursor() as cur:
        cur.execute(
            """
            UPDATE projects
            SET status = 'peer_review',
                completed_at = NOW(),
                peer_review_ends_at = NOW() + INTERVAL '7 days'
            WHERE id = %s
            """,
            (project_id,),
        )
    db_conn.commit()


def _valid_review(reviewee_id: str) -> dict:
    return {
        "reviewee_id": reviewee_id,
        "contribution_quality": 4,
        "communication": 5,
        "reliability": 4,
        "overall": 5,
        "comment": "Great teammate",
    }


def test_submit_review_valid_returns_201(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(reviewee_id),
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 201
    data = response.json()
    assert "reviewer_id" not in data
    assert data["reviewee_id"] == reviewee_id
    assert data["contribution_quality"] == 4


def test_cannot_review_self(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    owner_id = next(m["id"] for m in members if m["email"] == ctx["owner_email"])

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(owner_id),
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 400


def test_cannot_review_non_member(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="peer-outsider@example.com"
    )
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(reviewee_id),
        headers=outsider_headers,
    )

    assert response.status_code == 403


def test_scores_must_be_between_1_and_5(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])
    payload = _valid_review(reviewee_id)
    payload["overall"] = 6

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=payload,
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 422


def test_cannot_submit_twice_for_same_reviewee(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])
    headers = _owner_headers(auth_client, ctx)
    payload = _valid_review(reviewee_id)

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=payload,
        headers=headers,
    )
    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 409


def test_only_available_in_peer_review_phase(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(reviewee_id),
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 400


def test_reviews_are_anonymous_in_list(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(reviewee_id),
        headers=_owner_headers(auth_client, ctx),
    )

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review/status",
        headers=_member_one_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["submitted_count"] == 1
    assert "reviews" not in data or all("reviewer_id" not in r for r in data.get("reviews", []))


def test_get_review_status_shows_submitters(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_ids = {
        m["email"]: m["id"]
        for m in members
        if m["email"] != ctx["owner_email"]
    }

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(reviewee_ids[ctx["member_one_email"]]),
        headers=_owner_headers(auth_client, ctx),
    )

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review/status",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    data = response.json()
    assert ctx["owner_email"] in data["submitted_by"]
    assert len(data["pending_members"]) >= 1


def test_project_status_completed_after_all_members_submit_reviews(
    auth_client,
    email_outbox,
    db_conn,
):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    by_email = {m["email"]: m["id"] for m in members}

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(by_email[ctx["member_one_email"]]),
        headers=_owner_headers(auth_client, ctx),
    )
    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(by_email[ctx["owner_email"]]),
        headers=_member_one_headers(auth_client, ctx),
    )
    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(by_email[ctx["owner_email"]]),
        headers=_member_two_headers(auth_client, ctx),
    )

    assert response.status_code == 201

    project_response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}",
        headers=_owner_headers(auth_client, ctx),
    )
    assert project_response.json()["status"] == "completed"

    status_response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review/status",
        headers=_owner_headers(auth_client, ctx),
    )
    assert status_response.json()["project_status"] == "completed"
    assert status_response.json()["is_open"] is False


def test_get_non_submitters_after_deadline(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    with db_conn.cursor() as cur:
        cur.execute(
            """
            UPDATE projects
            SET status = 'peer_review',
                completed_at = NOW() - INTERVAL '8 days',
                peer_review_ends_at = NOW() - INTERVAL '1 day'
            WHERE id = %s
            """,
            (ctx["project"]["id"],),
        )
    db_conn.commit()

    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    reviewee_id = next(m["id"] for m in members if m["email"] == ctx["member_one_email"])
    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(reviewee_id),
        headers=_owner_headers(auth_client, ctx),
    )

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review/status",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert len(response.json()["non_submitters"]) >= 1


def test_aggregate_scores_available_to_members(auth_client, email_outbox, db_conn):
    ctx = _setup_three_member_project(auth_client, email_outbox, db_conn)
    _set_peer_review_status(db_conn, ctx["project"]["id"])
    members = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members",
        headers=_owner_headers(auth_client, ctx),
    ).json()
    by_email = {m["email"]: m["id"] for m in members}

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(by_email[ctx["member_one_email"]]),
        headers=_owner_headers(auth_client, ctx),
    )
    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review",
        json=_valid_review(by_email[ctx["owner_email"]]),
        headers=_member_one_headers(auth_client, ctx),
    )

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/peer-review/aggregates",
        headers=_member_two_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    aggregates = response.json()["items"]
    assert len(aggregates) >= 1
    assert all("reviewer_id" not in item for item in aggregates)
    assert aggregates[0]["avg_overall"] > 0
