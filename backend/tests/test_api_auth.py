"""Phase 3 — authentication API.

Covers the full auth surface: registration (unique username + email),
login success/failure, ``/me``, password change, and the 501 verification
stub. The uniqueness and password tests matter because a silent duplicate
or a plaintext password would not surface until later phases.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.security import verify_password


class TestRegister:
    def test_register_returns_201_with_public_user(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "username": "bob",
                "email": "bob@example.com",
                "password": "secret1pass",
            },
        )
        assert response.status_code == 201, response.text
        body = response.json()["user"]
        assert body["username"] == "bob"
        assert body["email"] == "bob@example.com"
        assert body["role"] == "user"
        assert "password" not in body and "password_hash" not in body

    def test_register_stores_hashed_password(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "carol",
                "email": "carol@example.com",
                "password": "secret1pass",
            },
        )
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.username == "carol"))
        assert user.password_hash != "secret1pass"
        assert verify_password("secret1pass", user.password_hash)

    def test_duplicate_username_conflicts(self, client, registered_user):
        response = client.post(
            "/api/auth/register",
            json={
                "username": registered_user["username"],
                "email": "other@example.com",
                "password": "secret1pass",
            },
        )
        assert response.status_code == 409

    def test_duplicate_email_conflicts(self, client, registered_user):
        response = client.post(
            "/api/auth/register",
            json={
                "username": "different",
                "email": registered_user["email"],
                "password": "secret1pass",
            },
        )
        assert response.status_code == 409

    def test_username_regex_rejected_with_422(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "username": "no spaces",
                "email": "x@example.com",
                "password": "secret1pass",
            },
        )
        assert response.status_code == 422

    def test_invalid_email_rejected_with_422(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "username": "dave",
                "email": "not-an-email",
                "password": "secret1pass",
            },
        )
        assert response.status_code == 422

    def test_weak_password_rejected_with_422(self, client):
        response = client.post(
            "/api/auth/register",
            json={"username": "erin", "email": "erin@example.com", "password": "short"},
        )
        assert response.status_code == 422


class TestLogin:
    def test_login_returns_token_and_user(self, client, registered_user):
        response = client.post(
            "/api/auth/login",
            json={
                "username": registered_user["username"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["user"]["username"] == registered_user["username"]

    def test_bad_password_returns_401(self, client, registered_user):
        response = client.post(
            "/api/auth/login",
            json={"username": registered_user["username"], "password": "wrong-pass1"},
        )
        assert response.status_code == 401

    def test_unknown_user_returns_401(self, client):
        response = client.post(
            "/api/auth/login", json={"username": "ghost", "password": "secret1pass"}
        )
        assert response.status_code == 401

    def test_seed_admin_can_log_in(self, client):
        response = client.post(
            "/api/auth/login", json={"username": "admin", "password": "Admin@123"}
        )
        assert response.status_code == 200
        assert response.json()["user"]["role"] == "admin"


class TestMe:
    def test_me_returns_current_user(self, client, auth_headers, registered_user):
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["username"] == registered_user["username"]

    def test_me_without_token_returns_401(self, client):
        assert client.get("/api/auth/me").status_code == 401

    def test_me_with_garbage_token_returns_401(self, client):
        response = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
        )
        assert response.status_code == 401


class TestChangePassword:
    def test_change_password_then_login_with_new(
        self, client, auth_headers, registered_user
    ):
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers,
            json={
                "old_password": registered_user["password"],
                "new_password": "brandnew2pw",
            },
        )
        assert response.status_code == 200

        old_login = client.post(
            "/api/auth/login",
            json={
                "username": registered_user["username"],
                "password": registered_user["password"],
            },
        )
        assert old_login.status_code == 401

        new_login = client.post(
            "/api/auth/login",
            json={"username": registered_user["username"], "password": "brandnew2pw"},
        )
        assert new_login.status_code == 200

    def test_wrong_old_password_returns_400(self, client, auth_headers):
        response = client.post(
            "/api/auth/change-password",
            headers=auth_headers,
            json={"old_password": "not-my-pass1", "new_password": "brandnew2pw"},
        )
        assert response.status_code == 400

    def test_change_password_requires_auth(self, client):
        response = client.post(
            "/api/auth/change-password",
            json={"old_password": "x", "new_password": "brandnew2pw"},
        )
        assert response.status_code == 401


class TestVerifyEmail:
    def test_verify_email_is_501_stub(self, client):
        response = client.post("/api/auth/verify-email")
        assert response.status_code == 501
