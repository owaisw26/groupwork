from datetime import date, datetime, timedelta, timezone

from tests.auth_helpers import (
    auth_headers,
    extract_token_from_email,
    login_user,
    register_user,
)


def _verified_user(client, email_outbox, email="owner@example.com", password="Password1"):
    register_user(client, email=email, password=password)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(client, email=email, password=password)
    return auth_headers(client)


def _create_project(client, headers, **overrides):
    payload = {
        "name": "Capstone Project",
        "description": "Final year project",
        "course": "CS101",
        "due_date": "2026-12-31",
        "max_members": 6,
    }
    payload.update(overrides)
    return client.post("/api/v1/projects", json=payload, headers=headers)


def test_create_project_valid_returns_201_with_join_code(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)

    response = _create_project(auth_client, headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Capstone Project"
    assert data["join_code"]
    assert len(data["join_code"]) == 6
    assert data["join_code"].isalnum()


def test_create_project_missing_name_returns_422(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)

    response = auth_client.post(
        "/api/v1/projects",
        json={"description": "No name"},
        headers=headers,
    )

    assert response.status_code == 422


def test_create_project_unverified_user_returns_403(auth_client, email_outbox):
    register_user(auth_client, email="unverified@example.com")
    login_user(auth_client, email="unverified@example.com")
    headers = auth_headers(auth_client)

    response = _create_project(auth_client, headers)

    assert response.status_code == 403


def test_list_projects_returns_only_member_projects(auth_client, email_outbox):
    owner_headers = _verified_user(auth_client, email_outbox, email="owner@example.com")
    _create_project(auth_client, owner_headers, name="Owner Project")

    other_headers = _verified_user(auth_client, email_outbox, email="other@example.com")
    _create_project(auth_client, other_headers, name="Other Project")

    response = auth_client.get("/api/v1/projects", headers=owner_headers)

    assert response.status_code == 200
    names = {project["name"] for project in response.json()}
    assert names == {"Owner Project"}


def test_list_projects_empty_for_new_user(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox, email="newuser@example.com")

    response = auth_client.get("/api/v1/projects", headers=headers)

    assert response.status_code == 200
    assert response.json() == []


def test_get_project_returns_details_for_member(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()

    response = auth_client.get(f"/api/v1/projects/{created['id']}", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
    assert response.json()["member_count"] == 1


def test_get_project_returns_403_for_non_member(auth_client, email_outbox):
    owner_headers = _verified_user(auth_client, email_outbox, email="owner2@example.com")
    created = _create_project(auth_client, owner_headers).json()

    other_headers = _verified_user(auth_client, email_outbox, email="outsider@example.com")
    response = auth_client.get(f"/api/v1/projects/{created['id']}", headers=other_headers)

    assert response.status_code == 403


def test_update_project_owner_can_update(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()

    response = auth_client.put(
        f"/api/v1/projects/{created['id']}",
        json={"name": "Updated Name"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


def test_update_project_non_owner_returns_403(auth_client, email_outbox, db_conn):
    owner_headers = _verified_user(auth_client, email_outbox, email="owner3@example.com")
    created = _create_project(auth_client, owner_headers).json()

    member_headers = _verified_user(auth_client, email_outbox, email="member@example.com")
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE email = %s",
            ("member@example.com",),
        )
        member_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO project_members (project_id, user_id) VALUES (%s, %s)",
            (created["id"], member_id),
        )
    db_conn.commit()

    response = auth_client.put(
        f"/api/v1/projects/{created['id']}",
        json={"name": "Hijacked"},
        headers=member_headers,
    )

    assert response.status_code == 403


def test_soft_delete_owner_can_delete(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()

    response = auth_client.delete(f"/api/v1/projects/{created['id']}", headers=headers)

    assert response.status_code == 200


def test_soft_delete_non_owner_returns_403(auth_client, email_outbox, db_conn):
    owner_headers = _verified_user(auth_client, email_outbox, email="owner4@example.com")
    created = _create_project(auth_client, owner_headers).json()

    member_headers = _verified_user(auth_client, email_outbox, email="member2@example.com")
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", ("member2@example.com",))
        member_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO project_members (project_id, user_id) VALUES (%s, %s)",
            (created["id"], member_id),
        )
    db_conn.commit()

    response = auth_client.delete(f"/api/v1/projects/{created['id']}", headers=member_headers)

    assert response.status_code == 403


def test_deleted_project_not_in_list(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()
    auth_client.delete(f"/api/v1/projects/{created['id']}", headers=headers)

    response = auth_client.get("/api/v1/projects", headers=headers)

    assert response.status_code == 200
    assert response.json() == []


def test_deleted_project_returns_404_on_direct_access(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()
    auth_client.delete(f"/api/v1/projects/{created['id']}", headers=headers)

    response = auth_client.get(f"/api/v1/projects/{created['id']}", headers=headers)

    assert response.status_code == 404


def test_regenerate_join_code_creates_new_code(auth_client, email_outbox):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()
    old_code = created["join_code"]

    response = auth_client.post(
        f"/api/v1/projects/{created['id']}/regenerate-code",
        headers=headers,
    )

    assert response.status_code == 200
    new_code = response.json()["join_code"]
    assert new_code != old_code
    assert len(new_code) == 6


def test_regenerate_join_code_invalidates_old_code(auth_client, email_outbox, db_conn):
    headers = _verified_user(auth_client, email_outbox)
    created = _create_project(auth_client, headers).json()
    old_code = created["join_code"]

    auth_client.post(f"/api/v1/projects/{created['id']}/regenerate-code", headers=headers)

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT join_code FROM projects WHERE id = %s",
            (created["id"],),
        )
        current_code = cur.fetchone()[0]

    assert current_code != old_code


def test_regenerate_join_code_non_owner_returns_403(auth_client, email_outbox, db_conn):
    owner_headers = _verified_user(auth_client, email_outbox, email="owner5@example.com")
    created = _create_project(auth_client, owner_headers).json()

    member_headers = _verified_user(auth_client, email_outbox, email="member3@example.com")
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", ("member3@example.com",))
        member_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO project_members (project_id, user_id) VALUES (%s, %s)",
            (created["id"], member_id),
        )
    db_conn.commit()

    response = auth_client.post(
        f"/api/v1/projects/{created['id']}/regenerate-code",
        headers=member_headers,
    )

    assert response.status_code == 403
