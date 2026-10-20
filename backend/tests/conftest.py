"""Shared pytest fixtures.

Tests run against an isolated temporary SQLite file so the developer's real
``compiler_lab.db`` is never touched. Every test gets a fresh schema: the
``client`` fixture creates the app (which runs table creation + seed admin)
against a cleaned database, so tests cannot leak state into one another.
"""

import os
import tempfile

import pytest

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["JWT_SECRET"] = "test-secret-key-for-hs256-at-least-32-bytes"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import Base, engine
from app.main import create_app

get_settings.cache_clear()


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(create_app()) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def registered_user(client):
    """A non-admin user created through the real register endpoint."""
    credentials = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret1pass",
    }
    response = client.post("/api/auth/register", json=credentials)
    assert response.status_code == 201, response.text
    return credentials


@pytest.fixture
def auth_headers(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={
            "username": registered_user["username"],
            "password": registered_user["password"],
        },
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def pytest_sessionfinish(session, exitstatus):
    os.close(_db_fd)
    for suffix in ("", "-journal", "-wal"):
        try:
            os.remove(_db_path + suffix)
        except OSError:
            pass
