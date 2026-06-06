from tests.task_helpers import create_project, create_task, verified_user


def test_search_tasks_by_title(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="search-user@example.com")
    project = create_project(auth_client, headers).json()
    create_task(auth_client, headers, project["id"], title="Authentication module")
    create_task(auth_client, headers, project["id"], title="Database migration")

    response = auth_client.get("/api/v1/search/tasks?q=auth", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert "Authentication" in data["items"][0]["title"]


def test_search_empty_query_returns_empty(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="search-empty@example.com")
    project = create_project(auth_client, headers).json()
    create_task(auth_client, headers, project["id"], title="Some task")

    response = auth_client.get("/api/v1/search/tasks?q=", headers=headers)

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["next_cursor"] is None


def test_search_scoped_to_user_projects_only(auth_client, email_outbox):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="search-owner@example.com"
    )
    owner_project = create_project(auth_client, owner_headers, name="Owner project").json()
    create_task(auth_client, owner_headers, owner_project["id"], title="Secret planning")

    other_headers, _ = verified_user(
        auth_client, email_outbox, email="search-other@example.com"
    )
    other_project = create_project(auth_client, other_headers, name="Other project").json()
    create_task(auth_client, other_headers, other_project["id"], title="Secret planning")

    response = auth_client.get("/api/v1/search/tasks?q=Secret", headers=other_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["project_id"] == other_project["id"]


def test_search_sql_injection_safe(auth_client, email_outbox, db_conn):
    headers, _ = verified_user(auth_client, email_outbox, email="search-sqli@example.com")
    project = create_project(auth_client, headers).json()
    create_task(auth_client, headers, project["id"], title="Normal task")

    response = auth_client.get(
        "/api/v1/search/tasks?q=' OR '1'='1",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["items"] == []

    with db_conn.cursor() as cur:
        cur.execute("SELECT to_regclass('public.tasks')")
        assert cur.fetchone()[0] == "tasks"
