from datetime import datetime, timezone

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


def _setup_project(auth_client, email_outbox, db_conn):
    owner_email = "meeting-owner@example.com"
    member_email = "meeting-member@example.com"
    owner_headers, _ = verified_user(auth_client, email_outbox, email=owner_email)
    project = create_project(auth_client, owner_headers).json()
    _register_and_verify(auth_client, email_outbox, member_email)
    add_project_member(db_conn, project["id"], member_email)
    return {
        "owner_email": owner_email,
        "member_email": member_email,
        "project": project,
    }


def _meeting_payload(**overrides):
    payload = {
        "meeting_date": datetime.now(timezone.utc).isoformat(),
        "agenda": "Sprint planning",
        "discussion_points": "Discussed milestones",
        "action_items": [],
        "notes": "Good meeting",
        "attendee_ids": [],
        "create_tasks_from_action_items": False,
    }
    payload.update(overrides)
    return payload


def test_create_meeting_valid_returns_201(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    headers = switch_user(auth_client, ctx["owner_email"])
    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(),
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["agenda"] == "Sprint planning"


def test_create_meeting_non_member_returns_403(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    owner_headers = switch_user(auth_client, ctx["owner_email"])
    project = ctx["project"]
    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="meeting-outsider@example.com"
    )
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/meetings",
        json=_meeting_payload(),
        headers=outsider_headers,
    )
    assert response.status_code == 403


def test_create_meeting_missing_date_returns_422(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    headers = switch_user(auth_client, ctx["owner_email"])
    payload = _meeting_payload()
    del payload["meeting_date"]
    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 422


def test_update_meeting_creator_can_update(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    headers = switch_user(auth_client, ctx["owner_email"])
    meeting = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(),
        headers=headers,
    ).json()
    response = auth_client.put(
        f"/api/v1/projects/{ctx['project']['id']}/meetings/{meeting['id']}",
        json={"notes": "Updated notes"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["notes"] == "Updated notes"


def test_update_meeting_owner_can_update(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    member_headers = switch_user(auth_client, ctx["member_email"])
    meeting = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(),
        headers=member_headers,
    ).json()
    owner_headers = switch_user(auth_client, ctx["owner_email"])
    response = auth_client.put(
        f"/api/v1/projects/{ctx['project']['id']}/meetings/{meeting['id']}",
        json={"notes": "Owner updated"},
        headers=owner_headers,
    )
    assert response.status_code == 200


def test_update_meeting_other_member_returns_403(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    owner_headers = switch_user(auth_client, ctx["owner_email"])
    meeting = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(),
        headers=owner_headers,
    ).json()
    member_headers = switch_user(auth_client, ctx["member_email"])
    response = auth_client.put(
        f"/api/v1/projects/{ctx['project']['id']}/meetings/{meeting['id']}",
        json={"notes": "Should fail"},
        headers=member_headers,
    )
    assert response.status_code == 403


def test_meetings_have_no_delete_endpoint(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    headers = switch_user(auth_client, ctx["owner_email"])
    meeting = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(),
        headers=headers,
    ).json()
    response = auth_client.delete(
        f"/api/v1/projects/{ctx['project']['id']}/meetings/{meeting['id']}",
        headers=headers,
    )
    assert response.status_code in (404, 405)


def test_attendance_tracked_and_rate_calculated(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    headers = switch_user(auth_client, ctx["owner_email"])
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (ctx["owner_email"],))
        owner_id = str(cur.fetchone()[0])
        cur.execute("SELECT id FROM users WHERE email = %s", (ctx["member_email"],))
        member_id = str(cur.fetchone()[0])

    auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(attendee_ids=[owner_id]),
        headers=headers,
    )

    rate_response = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members/{owner_id}/attendance-rate",
        headers=headers,
    )
    assert rate_response.status_code == 200
    assert rate_response.json()["attendance_rate"] == 100.0

    member_rate = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/members/{member_id}/attendance-rate",
        headers=headers,
    )
    assert member_rate.json()["attendance_rate"] == 0.0


def test_action_item_create_as_task(auth_client, email_outbox, db_conn):
    ctx = _setup_project(auth_client, email_outbox, db_conn)
    headers = switch_user(auth_client, ctx["owner_email"])
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (ctx["owner_email"],))
        owner_id = str(cur.fetchone()[0])

    response = auth_client.post(
        f"/api/v1/projects/{ctx['project']['id']}/meetings",
        json=_meeting_payload(
            action_items=[
                {
                    "description": "Write report section",
                    "assignee_id": owner_id,
                    "due_date": "2026-12-31",
                    "create_as_task": True,
                }
            ],
            create_tasks_from_action_items=True,
        ),
        headers=headers,
    )
    assert response.status_code == 201

    tasks = auth_client.get(
        f"/api/v1/projects/{ctx['project']['id']}/tasks",
        headers=headers,
    ).json()["items"]
    assert any(t["title"] == "Write report section" for t in tasks)
