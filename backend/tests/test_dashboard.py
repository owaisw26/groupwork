from datetime import date, timedelta

from tests.auth_helpers import auth_headers, extract_token_from_email, login_user, register_user


def _verified_user(client, email_outbox, email="dash@example.com"):
    register_user(client, email=email)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email=email)
    return auth_headers(client), email


def _create_project(client, headers, name="Dashboard Project"):
    return client.post(
        "/api/v1/projects",
        json={"name": name, "due_date": "2026-12-31"},
        headers=headers,
    ).json()


def test_dashboard_returns_widget_data(auth_client, email_outbox, db_conn):
    headers, email = _verified_user(auth_client, email_outbox)
    project = _create_project(auth_client, headers)

    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO tasks (project_id, title, status, priority, due_date, created_by)
            VALUES (%s, 'My assigned task', 'todo', 'high', %s, %s)
            RETURNING id
            """,
            (project["id"], date.today() + timedelta(days=3), user_id),
        )
        task_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO task_assignees (task_id, user_id) VALUES (%s, %s)",
            (task_id, user_id),
        )
        cur.execute(
            """
            INSERT INTO activity_log (project_id, user_id, action_type, entity_type, entity_id)
            VALUES (%s, %s, 'task_created', 'task', %s)
            """,
            (project["id"], user_id, task_id),
        )
    db_conn.commit()

    response = auth_client.get("/api/v1/dashboard", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["my_tasks"]) == 1
    assert data["my_tasks"][0]["title"] == "My assigned task"
    assert len(data["upcoming_deadlines"]) == 1
    task_activity = [
        item for item in data["recent_activity"] if item["action_type"] == "task_created"
    ]
    assert len(task_activity) == 1


def test_dashboard_empty_for_new_user(auth_client, email_outbox):
    headers, _ = _verified_user(auth_client, email_outbox, email="empty-dash@example.com")

    response = auth_client.get("/api/v1/dashboard", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["my_tasks"] == []
    assert data["upcoming_deadlines"] == []
    assert data["recent_activity"] == []


def test_project_activity_returns_project_events(auth_client, email_outbox, db_conn):
    headers, email = _verified_user(auth_client, email_outbox, email="activity@example.com")
    project = _create_project(auth_client, headers, name="Activity Project")

    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO activity_log (project_id, user_id, action_type, entity_type, entity_id)
            VALUES (%s, %s, 'task_updated', 'task', %s)
            """,
            (project["id"], user_id, project["id"]),
        )
    db_conn.commit()

    response = auth_client.get(f"/api/v1/projects/{project['id']}/activity", headers=headers)

    assert response.status_code == 200
    data = response.json()
    task_events = [event for event in data if event["action_type"] == "task_updated"]
    assert len(task_events) == 1
    assert task_events[0]["project_id"] == project["id"]
