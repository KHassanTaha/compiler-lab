"""Phase 2 — backend foundation.

Verifies the health endpoint, CORS wiring, table creation, and the
idempotent seed-admin contract. These tests exist because a misconfigured
seed (wrong role, hashed plaintext, or duplicated admin on restart) would
break every downstream auth test in a way that is hard to trace.
"""

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.main import SEED_ADMIN
from app.models import User
from app.security import verify_password


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_origins_are_split_from_comma_string():
    assert settings.cors_origin_list == ["http://localhost:5173"]


def test_cors_preflight_allows_frontend_origin(client):
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


SQL_TABLES = {"users", "runs", "snippets"}


def test_tables_created(client):
    with SessionLocal() as db:
        table_names = set(db.get_bind().dialect.get_table_names(db.connection()))
    assert SQL_TABLES <= table_names, "startup must create users, runs, and snippets"


def test_seed_admin_has_hashed_password_and_admin_role(client):
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.username == SEED_ADMIN["username"]))

    assert admin is not None, "seed admin must exist after startup"
    assert admin.role == "admin"
    assert (
        admin.password_hash != SEED_ADMIN["password"]
    ), "password must never be stored plaintext"
    assert verify_password(SEED_ADMIN["password"], admin.password_hash)


def test_seed_admin_is_idempotent(client):
    from app.main import seed_admin

    seed_admin()
    seed_admin()

    with SessionLocal() as db:
        admins = db.scalars(
            select(User).where(User.username == SEED_ADMIN["username"])
        ).all()

    assert len(admins) == 1, "restarting must not duplicate the seed admin"
