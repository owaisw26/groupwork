from tests.auth_helpers import auth_headers, extract_token_from_email, login_user, register_user


def verified_user(client, email_outbox, email="owner@example.com", password="Password1"):
    register_user(client, email=email, password=password)
    token = extract_token_from_email(email_outbox[-1]["body"])
    client.post("/api/v1/auth/verify-email", json={"token": token})
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
