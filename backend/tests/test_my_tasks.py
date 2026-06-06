from tests.task_helpers import add_project_member, create_project, create_task, verified_user


def test_my_tasks_returns_assigned_tasks_across_projects(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="mytasks-user@example.com")
    project_one = create_project(auth_client, headers, name="Project One").json()
    project_two = create_project(auth_client, headers, name="Project Two").json()

    create_task(auth_client, headers, project_one["id"], title="Task in one")
    create_task(auth_client, headers, project_two["id"], title="Task in two")

    response = auth_client.get("/api/v1/my-tasks", headers=headers)

    assert response.status_code == 200
    data = response.json()
    titles = {item["title"] for item in data["items"]}
    assert titles == {"Task in one", "Task in two"}
    project_names = {item["project_name"] for item in data["items"]}
    assert project_names == {"Project One", "Project Two"}


def test_my_tasks_excludes_unassigned_tasks(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="mytasks-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    create_task(auth_client, owner_headers, project["id"], title="Owner only")
    shared = create_task(auth_client, owner_headers, project["id"], title="Shared").json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="mytasks-member@example.com"
    )
    member_id = add_project_member(db_conn, project["id"], member_email)
    with db_conn.cursor() as cur:
        cur.execute("DELETE FROM task_assignees WHERE task_id = %s", (shared["id"],))
        cur.execute(
            "INSERT INTO task_assignees (task_id, user_id) VALUES (%s, %s)",
            (shared["id"], member_id),
        )
    db_conn.commit()

    response = auth_client.get("/api/v1/my-tasks", headers=member_headers)

    assert response.status_code == 200
    titles = {item["title"] for item in response.json()["items"]}
    assert "Shared" in titles
    assert "Owner only" not in titles


def test_my_tasks_sortable(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="mytasks-sort@example.com")
    project = create_project(auth_client, headers).json()
    create_task(
        auth_client,
        headers,
        project["id"],
        title="Later",
        due_date="2026-12-31",
    )
    create_task(
        auth_client,
        headers,
        project["id"],
        title="Sooner",
        due_date="2026-06-01",
    )

    response = auth_client.get(
        "/api/v1/my-tasks?sort_by=due_date&sort_order=asc",
        headers=headers,
    )

    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert titles == ["Sooner", "Later"]


def test_my_tasks_cursor_pagination(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="mytasks-page@example.com")
    project = create_project(auth_client, headers).json()
    for index in range(3):
        create_task(
            auth_client,
            headers,
            project["id"],
            title=f"My task {index}",
            due_date=f"2026-0{index + 1}-01",
        )

    first = auth_client.get("/api/v1/my-tasks?limit=2", headers=headers)
    assert first.status_code == 200
    first_data = first.json()
    assert len(first_data["items"]) == 2
    assert first_data["next_cursor"] is not None

    second = auth_client.get(
        f"/api/v1/my-tasks?limit=2&cursor={first_data['next_cursor']}",
        headers=headers,
    )
    assert second.status_code == 200
    assert len(second.json()["items"]) == 1
