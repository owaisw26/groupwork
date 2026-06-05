import re
from typing import Any

from fastapi.testclient import TestClient

DEFAULT_PASSWORD = "Password1"


def register_user(
    client: TestClient,
    *,
    email: str = "test@example.com",
    password: str = DEFAULT_PASSWORD,
    full_name: str = "Test User",
) -> Any:
    return client.post(
        "/api/v1/auth/register",
        json={"full_name": full_name, "email": email, "password": password},
    )


def login_user(
    client: TestClient,
    *,
    email: str = "test@example.com",
    password: str = DEFAULT_PASSWORD,
    csrf_token: str | None = None,
) -> Any:
    headers = {}
    if csrf_token:
        headers["X-CSRF-Token"] = csrf_token
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=headers,
    )


def extract_token_from_email(body: str) -> str:
    match = re.search(r"token=([A-Za-z0-9_-]+)", body)
    if match:
        return match.group(1)
    match = re.search(r"/(?:verify-email|reset-password)/([A-Za-z0-9_-]+)", body)
    if match:
        return match.group(1)
    raise ValueError("Token not found in email body")


def auth_headers(client: TestClient) -> dict[str, str]:
    csrf = client.cookies.get("csrf_token")
    if not csrf:
        return {}
    return {"X-CSRF-Token": csrf}
