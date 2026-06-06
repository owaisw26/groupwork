from datetime import datetime, timedelta, timezone

from tests.auth_helpers import register_user
from tests.task_helpers import (
    add_project_member,
    create_project,
    create_task,
    switch_user,
    verified_user,
)


def test_create_task_valid_returns_201(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-owner@example.com")
    project = create_project(auth_client, headers).json()

    response = create_task(auth_client, headers, project["id"])

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Implement API"
    assert data["status"] == "todo"
    assert data["priority"] == "medium"
    assert data["project_id"] == project["id"]


def test_create_task_non_member_returns_403(auth_client, email_outbox):
    owner_headers, _ = verified_user(auth_client, email_outbox, email="task-owner2@example.com")
    project = create_project(auth_client, owner_headers).json()

    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="task-outsider@example.com"
    )
    response = create_task(auth_client, outsider_headers, project["id"])

    assert response.status_code == 403


def test_create_task_missing_title_returns_422(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-no-title@example.com")
    project = create_project(auth_client, headers).json()

    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/tasks",
        json={"description": "No title"},
        headers=headers,
    )

    assert response.status_code == 422


def test_list_tasks_returns_project_tasks(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-list@example.com")
    project = create_project(auth_client, headers).json()
    create_task(auth_client, headers, project["id"], title="Task A")
    create_task(auth_client, headers, project["id"], title="Task B", status="in_progress")

    response = auth_client.get(
        f"/api/v1/projects/{project['id']}/tasks",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["next_cursor"] is None


def test_list_tasks_filter_by_status(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-filter@example.com")
    project = create_project(auth_client, headers).json()
    create_task(auth_client, headers, project["id"], title="Todo task")
    create_task(auth_client, headers, project["id"], title="Done task", status="done")

    response = auth_client.get(
        f"/api/v1/projects/{project['id']}/tasks?status=done",
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["title"] == "Done task"


def test_list_tasks_filter_by_priority(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-priority@example.com")
    project = create_project(auth_client, headers).json()
    create_task(auth_client, headers, project["id"], title="Low", priority="low")
    create_task(auth_client, headers, project["id"], title="Urgent", priority="urgent")

    response = auth_client.get(
        f"/api/v1/projects/{project['id']}/tasks?priority=urgent",
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["priority"] == "urgent"


def test_list_tasks_cursor_pagination(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-page@example.com")
    project = create_project(auth_client, headers).json()
    for index in range(3):
        create_task(auth_client, headers, project["id"], title=f"Task {index}")

    first = auth_client.get(
        f"/api/v1/projects/{project['id']}/tasks?limit=2",
        headers=headers,
    )
    assert first.status_code == 200
    first_data = first.json()
    assert len(first_data["items"]) == 2
    assert first_data["next_cursor"] is not None

    second = auth_client.get(
        f"/api/v1/projects/{project['id']}/tasks?limit=2&cursor={first_data['next_cursor']}",
        headers=headers,
    )
    assert second.status_code == 200
    second_data = second.json()
    assert len(second_data["items"]) == 1
    assert second_data["next_cursor"] is None


def test_update_task_status_moving_to_done_sets_verification(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-status@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "done"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["verification_status"] == "pending"


def test_update_task_non_owner_returns_403(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(auth_client, email_outbox, email="task-edit-owner@example.com")
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="task-edit-member@example.com"
    )
    add_project_member(db_conn, project["id"], member_email)

    response = auth_client.put(
        f"/api/v1/tasks/{task['id']}",
        json={"title": "Hijacked"},
        headers=member_headers,
    )

    assert response.status_code == 403


def test_delete_task_owner_can_delete(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-delete-owner@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = auth_client.delete(f"/api/v1/tasks/{task['id']}", headers=headers)

    assert response.status_code == 200
    get_response = auth_client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert get_response.status_code == 404


def test_delete_task_non_owner_returns_403(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(auth_client, email_outbox, email="task-del-owner@example.com")
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="task-del-member@example.com"
    )
    add_project_member(db_conn, project["id"], member_email)

    response = auth_client.delete(f"/api/v1/tasks/{task['id']}", headers=member_headers)

    assert response.status_code == 403


def test_create_subtask(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="subtask-create@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/subtasks",
        json={"title": "Write tests"},
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Write tests"
    assert response.json()["is_completed"] is False


def test_toggle_subtask_assignee_can_toggle(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="subtask-toggle-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="subtask-toggle-member@example.com"
    )
    member_id = add_project_member(db_conn, project["id"], member_email)
    with db_conn.cursor() as cur:
        cur.execute("DELETE FROM task_assignees WHERE task_id = %s", (task["id"],))
        cur.execute(
            "INSERT INTO task_assignees (task_id, user_id) VALUES (%s, %s)",
            (task["id"], member_id),
        )
    db_conn.commit()

    subtask = auth_client.post(
        f"/api/v1/tasks/{task['id']}/subtasks",
        json={"title": "Checklist item"},
        headers=member_headers,
    ).json()

    response = auth_client.patch(
        f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
        json={"is_completed": True},
        headers=member_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_completed"] is True


def test_toggle_subtask_non_assignee_returns_403(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="subtask-deny-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()
    subtask = auth_client.post(
        f"/api/v1/tasks/{task['id']}/subtasks",
        json={"title": "Only assignees"},
        headers=owner_headers,
    ).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="subtask-deny-member@example.com"
    )
    add_project_member(db_conn, project["id"], member_email)

    response = auth_client.patch(
        f"/api/v1/tasks/{task['id']}/subtasks/{subtask['id']}",
        json={"is_completed": True},
        headers=member_headers,
    )

    assert response.status_code == 403


def test_create_comment(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="comment-create@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={"content": "Looks good"},
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json()["content"] == "Looks good"


def test_edit_comment_within_five_minutes(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="comment-edit@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()
    comment = auth_client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={"content": "Original"},
        headers=headers,
    ).json()

    response = auth_client.put(
        f"/api/v1/tasks/{task['id']}/comments/{comment['id']}",
        json={"content": "Updated"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Updated"


def test_edit_comment_after_five_minutes_returns_403(auth_client, email_outbox, db_conn):
    headers, _ = verified_user(auth_client, email_outbox, email="comment-expire@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()
    comment = auth_client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={"content": "Too late"},
        headers=headers,
    ).json()

    old_time = datetime.now(timezone.utc) - timedelta(minutes=6)
    with db_conn.cursor() as cur:
        cur.execute(
            "UPDATE task_comments SET created_at = %s WHERE id = %s",
            (old_time, comment["id"]),
        )
    db_conn.commit()

    response = auth_client.put(
        f"/api/v1/tasks/{task['id']}/comments/{comment['id']}",
        json={"content": "Should fail"},
        headers=headers,
    )

    assert response.status_code == 403


def test_submit_edit_request_non_owner(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="edit-req-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="edit-req-member@example.com"
    )
    add_project_member(db_conn, project["id"], member_email)

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/request-edit",
        json={"proposed_changes": {"title": "Member proposal"}},
        headers=member_headers,
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["proposed_changes"]["title"] == "Member proposal"


def test_review_edit_request_approve_applies_changes(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="edit-approve-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="edit-approve-member@example.com"
    )
    member_id = add_project_member(db_conn, project["id"], member_email)

    edit_request = auth_client.post(
        f"/api/v1/tasks/{task['id']}/request-edit",
        json={"proposed_changes": {"title": "Approved title", "priority": "high"}},
        headers=member_headers,
    ).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/edit-requests/{edit_request['id']}/review",
        json={"approved": True},
        headers=switch_user(auth_client, "edit-approve-owner@example.com"),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    updated = auth_client.get(
        f"/api/v1/tasks/{task['id']}",
        headers=switch_user(auth_client, "edit-approve-owner@example.com"),
    ).json()
    assert updated["title"] == "Approved title"
    assert updated["priority"] == "high"

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT type, user_id FROM notifications
            WHERE related_entity_id = %s OR user_id = %s
            ORDER BY created_at DESC
            """,
            (task["id"], member_id),
        )
        notifications = cur.fetchall()
    assert any(row[0] == "task_edit_request_reviewed" for row in notifications)


def test_review_edit_request_reject_discards_changes(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="edit-reject-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, _ = verified_user(
        auth_client, email_outbox, email="edit-reject-member@example.com"
    )
    add_project_member(db_conn, project["id"], "edit-reject-member@example.com")

    edit_request = auth_client.post(
        f"/api/v1/tasks/{task['id']}/request-edit",
        json={"proposed_changes": {"title": "Rejected title"}},
        headers=member_headers,
    ).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/edit-requests/{edit_request['id']}/review",
        json={"approved": False},
        headers=switch_user(auth_client, "edit-reject-owner@example.com"),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"

    unchanged = auth_client.get(
        f"/api/v1/tasks/{task['id']}",
        headers=switch_user(auth_client, "edit-reject-owner@example.com"),
    ).json()
    assert unchanged["title"] == "Implement API"


def test_review_edit_request_approve_applies_status_change(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="edit-status-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="edit-status-member@example.com"
    )
    add_project_member(db_conn, project["id"], member_email)

    edit_request = auth_client.post(
        f"/api/v1/tasks/{task['id']}/request-edit",
        json={"proposed_changes": {"status": "in_progress"}},
        headers=member_headers,
    ).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/edit-requests/{edit_request['id']}/review",
        json={"approved": True},
        headers=switch_user(auth_client, "edit-status-owner@example.com"),
    )

    assert response.status_code == 200

    updated = auth_client.get(
        f"/api/v1/tasks/{task['id']}",
        headers=switch_user(auth_client, "edit-status-owner@example.com"),
    ).json()
    assert updated["status"] == "in_progress"


def test_update_task_status_leaving_done_resets_verification(auth_client, email_outbox):
    headers, _ = verified_user(
        auth_client, email_outbox, email="task-verification-reset@example.com"
    )
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"], status="done").json()
    assert task["verification_status"] == "pending"

    response = auth_client.patch(
        f"/api/v1/tasks/{task['id']}/status",
        json={"status": "in_progress"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"
    assert response.json()["verification_status"] == "none"


def test_create_task_non_member_assignee_returns_422(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="assignee-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()

    _, outsider_email = verified_user(
        auth_client, email_outbox, email="assignee-outsider@example.com"
    )
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (outsider_email,))
        outsider_id = str(cur.fetchone()[0])

    response = create_task(
        auth_client,
        owner_headers,
        project["id"],
        assignee_ids=[outsider_id],
    )

    assert response.status_code == 422


def test_task_title_sql_injection_stored_safely(auth_client, email_outbox, db_conn):
    headers, _ = verified_user(auth_client, email_outbox, email="task-sqli@example.com")
    project = create_project(auth_client, headers).json()
    malicious = "'; DROP TABLE tasks; --"

    response = create_task(auth_client, headers, project["id"], title=malicious)
    assert response.status_code == 201

    listed = auth_client.get(
        f"/api/v1/projects/{project['id']}/tasks",
        headers=headers,
    ).json()
    assert listed["items"][0]["title"] == malicious

    with db_conn.cursor() as cur:
        cur.execute("SELECT to_regclass('public.tasks')")
        assert cur.fetchone()[0] == "tasks"


def test_unauthenticated_task_request_returns_401(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="task-auth@example.com")
    project = create_project(auth_client, headers).json()

    auth_client.cookies.clear()
    response = auth_client.get(f"/api/v1/projects/{project['id']}/tasks")

    assert response.status_code == 401


def test_unverified_user_task_request_returns_403(auth_client, email_outbox, db_conn):
    register_user(auth_client, email="unverified-task@example.com")

    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", ("unverified-task@example.com",))
        user_id = str(cur.fetchone()[0])

    from app.utils.security import create_access_token

    auth_client.cookies.set("access_token", create_access_token(user_id, 0))
    response = auth_client.get("/api/v1/my-tasks")

    assert response.status_code == 403
