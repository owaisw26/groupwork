from tests.project_helpers import create_project, verified_user


def _setup_project(auth_client, email_outbox, email="invite-owner@example.com"):
    headers = verified_user(auth_client, email_outbox, email=email)
    project = create_project(auth_client, headers).json()
    return headers, project


def test_invite_sends_email(auth_client, email_outbox):
    headers, project = _setup_project(auth_client, email_outbox)
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "newmember@example.com"},
        headers=headers,
    )
    assert response.status_code == 201
    assert any(m["to"] == "newmember@example.com" for m in email_outbox)


def test_invite_existing_user(auth_client, email_outbox):
    headers, project = _setup_project(auth_client, email_outbox)
    verified_user(auth_client, email_outbox, email="existing@example.com")
    login_headers = verified_user(auth_client, email_outbox, email="invite-owner@example.com")
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "existing@example.com"},
        headers=login_headers,
    )
    assert response.status_code == 201


def test_invite_nonexisting_user(auth_client, email_outbox):
    headers, project = _setup_project(auth_client, email_outbox)
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "brandnew@example.com"},
        headers=headers,
    )
    assert response.status_code == 201


def test_duplicate_invite_returns_409(auth_client, email_outbox):
    headers, project = _setup_project(auth_client, email_outbox)
    auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "dup@example.com"},
        headers=headers,
    )
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "dup@example.com"},
        headers=headers,
    )
    assert response.status_code == 409


def test_invite_when_project_full_returns_400(auth_client, email_outbox, db_conn):
    headers, project = _setup_project(auth_client, email_outbox, email="full-owner@example.com")
    with db_conn.cursor() as cur:
        cur.execute("UPDATE projects SET max_members = 1 WHERE id = %s", (project["id"],))
    db_conn.commit()
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "full@example.com"},
        headers=headers,
    )
    assert response.status_code == 400


def test_member_can_invite(auth_client, email_outbox, db_conn):
    headers, project = _setup_project(auth_client, email_outbox, email="owner-inv@example.com")
    member_headers = verified_user(auth_client, email_outbox, email="member-inv@example.com")
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", ("member-inv@example.com",))
        member_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO project_members (project_id, user_id) VALUES (%s, %s)",
            (project["id"], member_id),
        )
    db_conn.commit()
    response = auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "invited-by-member@example.com"},
        headers=member_headers,
    )
    assert response.status_code == 201


def test_accept_invite_adds_member(auth_client, email_outbox):
    headers, project = _setup_project(auth_client, email_outbox, email="accept-owner@example.com")
    auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "acceptee@example.com"},
        headers=headers,
    )
    invite_email = next(m for m in email_outbox if m["to"] == "acceptee@example.com")
    token = extract_token_from_invite(invite_email["body"])

    acceptee_headers = verified_user(auth_client, email_outbox, email="acceptee@example.com")
    response = auth_client.post(
        "/api/v1/invitations/accept",
        json={"token": token},
        headers=acceptee_headers,
    )
    assert response.status_code == 200
    projects = auth_client.get("/api/v1/projects", headers=acceptee_headers).json()
    assert any(p["id"] == project["id"] for p in projects)


def test_expired_invite_returns_400(auth_client, email_outbox, db_conn):
    headers, project = _setup_project(auth_client, email_outbox, email="exp-inv@example.com")
    auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "expired-inv@example.com"},
        headers=headers,
    )
    with db_conn.cursor() as cur:
        cur.execute("UPDATE invitations SET expires_at = NOW() - INTERVAL '1 day'")
    db_conn.commit()
    invite_email = next(m for m in email_outbox if m["to"] == "expired-inv@example.com")
    token = extract_token_from_invite(invite_email["body"])
    acceptee_headers = verified_user(auth_client, email_outbox, email="expired-inv@example.com")
    response = auth_client.post(
        "/api/v1/invitations/accept",
        json={"token": token},
        headers=acceptee_headers,
    )
    assert response.status_code == 400


def test_accept_invite_when_project_full_returns_400(auth_client, email_outbox, db_conn):
    headers, project = _setup_project(auth_client, email_outbox, email="full-inv@example.com")
    auth_client.post(
        f"/api/v1/projects/{project['id']}/invite",
        json={"email": "full-accept@example.com"},
        headers=headers,
    )
    with db_conn.cursor() as cur:
        cur.execute("UPDATE projects SET max_members = 1 WHERE id = %s", (project["id"],))
    db_conn.commit()
    invite_email = next(m for m in email_outbox if m["to"] == "full-accept@example.com")
    token = extract_token_from_invite(invite_email["body"])
    acceptee_headers = verified_user(auth_client, email_outbox, email="full-accept@example.com")
    response = auth_client.post(
        "/api/v1/invitations/accept",
        json={"token": token},
        headers=acceptee_headers,
    )
    assert response.status_code == 400


def extract_token_from_invite(body: str) -> str:
    import re
    match = re.search(r"/invitations/accept/([A-Za-z0-9_-]+)", body)
    if not match:
        match = re.search(r"token=([A-Za-z0-9_-]+)", body)
    if not match:
        raise ValueError("Invite token not found")
    return match.group(1)
