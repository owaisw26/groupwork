from tests.auth_helpers import auth_headers, extract_token_from_email, login_user, register_user


def test_404_returns_structured_error(auth_client):
    response = auth_client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert "message" in body["error"]
    assert "X-Request-ID" in response.headers


def test_422_validation_returns_field_details(auth_client):
    response = auth_client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "short"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in body["error"]
    assert len(body["error"]["details"]) > 0
    assert "X-Request-ID" in response.headers


def test_500_returns_generic_error_without_stack_trace(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("COOKIE_SECURE", "true")
    monkeypatch.setenv("JWT_SECRET", "ci-production-test-jwt-secret-32chars")
    from app.config import get_settings

    get_settings.cache_clear()

    from fastapi.testclient import TestClient

    from app.main import create_app

    app = create_app()

    @app.get("/api/v1/test-error")
    def trigger_error():
        raise RuntimeError("sensitive internal failure")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/test-error")

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert "sensitive" not in str(body)
    assert "traceback" not in str(body).lower()


def test_rate_limit_returns_429_with_retry_after(auth_client, email_outbox):
    register_user(auth_client, email="ratelimit404@example.com")
    token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post("/api/v1/auth/verify-email", json={"token": token})

    for _ in range(6):
        login_user(auth_client, email="ratelimit404@example.com", password="WrongPass1")

    response = login_user(auth_client, email="ratelimit404@example.com", password="WrongPass1")

    assert response.status_code == 429
    assert "Retry-After" in response.headers
    body = response.json()
    assert body["error"]["code"] == "RATE_LIMIT_EXCEEDED"


def test_request_id_present_on_success_response(auth_client, email_outbox):
    register_user(auth_client, email="success@example.com")
    token = extract_token_from_email(email_outbox[-1]["body"])
    auth_client.post("/api/v1/auth/verify-email", json={"token": token})
    login_user(auth_client, email="success@example.com")

    response = auth_client.get("/api/v1/users/me", headers=auth_headers(auth_client))

    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 0
