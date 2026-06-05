import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql://localhost:5432/groupwork_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-key-for-pytest-only")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")


@pytest.fixture
def client():
    from app.main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
