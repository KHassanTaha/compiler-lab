"""Shared pytest fixtures.

Tests run against an isolated in-memory SQLite database so the local
``compiler_lab.db`` file is never touched. The temporary database file is
deleted on teardown.
"""

import os
import tempfile

import pytest

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["JWT_SECRET"] = "test-secret-key"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app

get_settings.cache_clear()


@pytest.fixture(scope="session")
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def pytest_sessionfinish(session, exitstatus):
    os.close(_db_fd)
    for suffix in ("", "-journal", "-wal"):
        try:
            os.remove(_db_path + suffix)
        except OSError:
            pass
