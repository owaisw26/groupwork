from tests.auth_helpers import auth_headers, login_user
from tests.project_helpers import create_project, verified_user


def _setup(auth_client, email_outbox, owner_email="join-owner@example.com"):
    headers = verified_user(auth_client, email_outbox, email=owner_email)
    project = create_project(auth_client, headers).json()
    return headers, project


def test_join_with_valid_code(auth_client, email_outbox):
    _, project = _setup(auth_client, email_outbox)
    joiner_headers = verified_user(auth_client, email_outbox, email="joiner@example.com")
    response = auth_client.post(
        "/api/v1/projects/join",
        json={"join_code": project["join_code"]},
        headers=joiner_headers,
    )
    assert response.status_code == 200
    projects = auth_client.get("/api/v1/projects", headers=joiner_headers).json()
    assert any(p["id"] == project["id"] for p in projects)


def test_join_expired_code_returns_400(auth_client, email_outbox, db_conn):
    _, project = _setup(auth_client, email_outbox, owner_email="exp-join@example.com")
    with db_conn.cursor() as cur:
        cur.execute(
            "UPDATE projects SET join_code_expires_at = NOW() - INTERVAL '1 day' WHERE id = %s",
            (project["id"],),
        )
    db_conn.commit()
    joiner_headers = verified_user(auth_client, email_outbox, email="exp-joiner@example.com")
    response = auth_client.post(
        "/api/v1/projects/join",
        json={"join_code": project["join_code"]},
        headers=joiner_headers,
    )
    assert response.status_code == 400


def test_join_invalid_code_returns_404(auth_client, email_outbox):
    headers = verified_user(auth_client, email_outbox, email="invalid-join@example.com")
    response = auth_client.post(
        "/api/v1/projects/join",
        json={"join_code": "ZZZZZZ"},
        headers=headers,
    )
    assert response.status_code == 404


def test_join_when_already_member_returns_409(auth_client, email_outbox):
    headers, project = _setup(auth_client, email_outbox, owner_email="dup-join@example.com")
    response = auth_client.post(
        "/api/v1/projects/join",
        json={"join_code": project["join_code"]},
        headers=headers,
    )
    assert response.status_code == 409


def test_leave_project_removes_member(auth_client, email_outbox):
    _, project = _setup(auth_client, email_outbox, owner_email="leave-owner@example.com")
    member_headers = verified_user(auth_client, email_outbox, email="leaver@example.com")
    auth_client.post(
        "/api/v1/projects/join",
        json={"join_code": project["join_code"]},
        headers=member_headers,
    )
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/leave",
        headers=member_headers,
    )
    assert response.status_code == 200
    projects = auth_client.get("/api/v1/projects", headers=member_headers).json()
    assert not any(p["id"] == project["id"] for p in projects)


def test_owner_cannot_leave_without_transfer(auth_client, email_outbox):
    headers, project = _setup(auth_client, email_outbox, owner_email="owner-leave@example.com")
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/leave",
        headers=headers,
    )
    assert response.status_code == 400


def test_transfer_ownership(auth_client, email_outbox, db_conn):
    headers, project = _setup(auth_client, email_outbox, owner_email="xfer-owner@example.com")
    member_headers = verified_user(auth_client, email_outbox, email="xfer-member@example.com")
    auth_client.post(
        "/api/v1/projects/join",
        json={"join_code": project["join_code"]},
        headers=member_headers,
    )
    login_user(auth_client, email="xfer-owner@example.com")
    owner_headers = auth_headers(auth_client)
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/transfer-ownership",
        json={"new_owner_id": _user_id(db_conn, "xfer-member@example.com")},
        headers=owner_headers,
    )
    assert response.status_code == 200
    assert response.json()["owner_id"] == _user_id(db_conn, "xfer-member@example.com")
    updated = auth_client.get(f"/api/v1/projects/{project['id']}", headers=owner_headers).json()
    assert updated["owner_id"] == _user_id(db_conn, "xfer-member@example.com")


def _user_id(db_conn, email: str) -> str:
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        return str(cur.fetchone()[0])
