from tests.auth_helpers import auth_headers, extract_token_from_email, login_user, register_user


def verified_user(client, email_outbox, email="owner@example.com", password="Password1"):
    register_user(client, email=email, password=password)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email=email, password=password)
    return auth_headers(client), email


def switch_user(client, email, password="Password1"):
    login_user(client, email=email, password=password)
    return auth_headers(client)


def create_project(client, headers, **overrides):
    payload = {
        "name": "Capstone Project",
        "description": "Final year project",
        "course": "CS101",
        "due_date": "2026-12-31",
        "max_members": 6,
    }
    payload.update(overrides)
    return client.post("/api/v1/projects", json=payload, headers=headers)


def create_task(client, headers, project_id, **overrides):
    payload = {
        "title": "Implement API",
        "description": "Build task endpoints",
        "status": "todo",
        "priority": "medium",
    }
    payload.update(overrides)
    return client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json=payload,
        headers=headers,
    )


def add_project_member(db_conn, project_id, email):
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO project_members (project_id, user_id) VALUES (%s, %s)",
            (project_id, user_id),
        )
    db_conn.commit()
    return user_id
