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


def _setup_two_member_project(auth_client, email_outbox, db_conn):
    owner_email = "notif-owner@example.com"
    member_email = "notif-member@example.com"
    owner_headers, _ = verified_user(auth_client, email_outbox, email=owner_email)
    project = create_project(auth_client, owner_headers).json()
    _register_and_verify(auth_client, email_outbox, member_email)
    add_project_member(db_conn, project["id"], member_email)
    return owner_email, member_email, project


def _count_notifications(db_conn, user_email: str, notification_type: str | None = None) -> int:
    with db_conn.cursor() as cur:
        if notification_type:
            cur.execute(
                """
                SELECT COUNT(*) FROM notifications n
                JOIN users u ON u.id = n.user_id
                WHERE u.email = %s AND n.type = %s
                """,
                (user_email, notification_type),
            )
        else:
            cur.execute(
                """
                SELECT COUNT(*) FROM notifications n
                JOIN users u ON u.id = n.user_id
                WHERE u.email = %s
                """,
                (user_email,),
            )
        return cur.fetchone()[0]


def test_notification_on_task_assignment(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (member_email,))
        member_id = str(cur.fetchone()[0])

    create_task(auth_client, owner_headers, project["id"], assignee_ids=[member_id])

    assert _count_notifications(db_conn, member_email, "task_assigned") >= 1


def test_notification_on_task_done(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    task = create_task(auth_client, owner_headers, project["id"]).json()
    auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=owner_headers,
    )
    assert _count_notifications(db_conn, member_email, "task_completed") >= 1


def test_notification_on_dispute_filed(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    task_resp = create_task(auth_client, owner_headers, project["id"])
    assert task_resp.status_code == 201
    task = task_resp.json()
    owner_headers = switch_user(auth_client, owner_email)
    auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=owner_headers,
    )
    member_headers = switch_user(auth_client, member_email)
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/dispute",
        json={"reason": "Not done properly"},
        headers=member_headers,
    )
    assert _count_notifications(db_conn, owner_email, "dispute_filed") >= 1


def test_notification_on_invite_received(auth_client, email_outbox, db_conn):
    owner_email, _, project = _setup_two_member_project(auth_client, email_outbox, db_conn)
    _register_and_verify(auth_client, email_outbox, "invited-notif@example.com")
    owner_headers = switch_user(auth_client, owner_email)
    auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "invited-notif@example.com"},
        headers=owner_headers,
    )
    assert _count_notifications(db_conn, "invited-notif@example.com", "invitation") >= 1


def test_list_notifications_paginated(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (member_email,))
        member_id = str(cur.fetchone()[0])
    for i in range(3):
        create_task(
            auth_client,
            owner_headers,
            project["id"],
            title=f"Task {i}",
            assignee_ids=[member_id],
        )

    member_headers = switch_user(auth_client, member_email)
    response = auth_client.get("/api/v1/notifications?limit=2", headers=member_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["next_cursor"] is not None

    second = auth_client.get(
        f"/api/v1/notifications?limit=2&cursor={data['next_cursor']}",
        headers=member_headers,
    )
    assert len(second.json()["items"]) >= 1


def test_mark_notification_read(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (member_email,))
        member_id = str(cur.fetchone()[0])
    create_task(auth_client, owner_headers, project["id"], assignee_ids=[member_id])

    member_headers = switch_user(auth_client, member_email)
    notifications = auth_client.get("/api/v1/notifications", headers=member_headers).json()
    notif_id = notifications["items"][0]["id"]
    response = auth_client.put(f"/api/v1/notifications/{notif_id}/read", headers=member_headers)
    assert response.status_code == 200
    assert response.json()["is_read"] is True


def test_mark_all_notifications_read(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (member_email,))
        member_id = str(cur.fetchone()[0])
    for i in range(2):
        create_task(
            auth_client,
            owner_headers,
            project["id"],
            title=f"Bulk {i}",
            assignee_ids=[member_id],
        )

    member_headers = switch_user(auth_client, member_email)
    response = auth_client.put("/api/v1/notifications/read-all", headers=member_headers)
    assert response.status_code == 200

    unread = auth_client.get("/api/v1/notifications/unread-count", headers=member_headers)
    assert unread.json()["count"] == 0


def test_update_notification_preferences(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="prefs@example.com")
    response = auth_client.put(
        "/api/v1/users/me/notification-preferences",
        json={"notification_type": "task_assigned", "email_enabled": False},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["email_enabled"] is False


def test_notifications_scoped_to_user(auth_client, email_outbox, db_conn):
    owner_email, member_email, project = _setup_two_member_project(
        auth_client, email_outbox, db_conn
    )
    owner_headers = switch_user(auth_client, owner_email)
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (member_email,))
        member_id = str(cur.fetchone()[0])
    create_task(auth_client, owner_headers, project["id"], assignee_ids=[member_id])

    member_headers = switch_user(auth_client, member_email)
    member_notifs = auth_client.get("/api/v1/notifications", headers=member_headers).json()

    owner_headers = switch_user(auth_client, owner_email)
    owner_notifs = auth_client.get("/api/v1/notifications", headers=owner_headers).json()

    member_ids = {n["id"] for n in member_notifs["items"]}
    owner_ids = {n["id"] for n in owner_notifs["items"]}
    assert member_ids.isdisjoint(owner_ids)
