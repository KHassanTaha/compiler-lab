"""Phase 6 — snippets CRUD and ownership isolation.

The ownership tests matter because leaking another user's snippet (via a
non-404 response) would be a privacy bug and violates pin B5.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Run

SNIPPET = {"name": "My sum", "code": "int x = 1; likho(x);"}


def runs(action=None):
    with SessionLocal() as db:
        query = select(Run)
        if action:
            query = query.where(Run.action == action)
        return db.scalars(query).all()


class TestSnippetCrud:
    def test_create_returns_detail_and_logs_input_saved(self, client, auth_headers):
        before = len(runs("input_saved"))
        response = client.post("/api/snippets", headers=auth_headers, json=SNIPPET)
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["name"] == SNIPPET["name"]
        assert body["code"] == SNIPPET["code"]
        assert len(runs("input_saved")) == before + 1

    def test_list_returns_preview_not_full_code(self, client, auth_headers):
        client.post(
            "/api/snippets",
            headers=auth_headers,
            json={"name": "big", "code": "a" * 200},
        )
        items = client.get("/api/snippets", headers=auth_headers).json()["items"]
        item = next(i for i in items if i["name"] == "big")
        assert "code" not in item
        assert item["code_preview"].endswith("\u2026")
        assert len(item["code_preview"]) == 121

    def test_get_detail_returns_full_code(self, client, auth_headers):
        created = client.post(
            "/api/snippets", headers=auth_headers, json=SNIPPET
        ).json()
        detail = client.get(
            f"/api/snippets/{created['id']}", headers=auth_headers
        ).json()
        assert detail["code"] == SNIPPET["code"]

    def test_update_logs_input_saved(self, client, auth_headers):
        created = client.post(
            "/api/snippets", headers=auth_headers, json=SNIPPET
        ).json()
        before = len(runs("input_saved"))
        response = client.put(
            f"/api/snippets/{created['id']}",
            headers=auth_headers,
            json={"name": "renamed", "code": "int y = 2;"},
        )
        assert response.status_code == 200, response.text
        assert response.json()["name"] == "renamed"
        assert len(runs("input_saved")) == before + 1

    def test_delete_then_get_is_404(self, client, auth_headers):
        created = client.post(
            "/api/snippets", headers=auth_headers, json=SNIPPET
        ).json()
        assert (
            client.delete(
                f"/api/snippets/{created['id']}", headers=auth_headers
            ).status_code
            == 204
        )
        assert (
            client.get(
                f"/api/snippets/{created['id']}", headers=auth_headers
            ).status_code
            == 404
        )

    def test_requires_auth(self, client):
        assert client.get("/api/snippets").status_code == 401


class TestSnippetOwnership:
    def test_other_users_snippet_is_404(self, client, auth_headers, registered_user):
        created = client.post(
            "/api/snippets", headers=auth_headers, json=SNIPPET
        ).json()

        client.post(
            "/api/auth/register",
            json={
                "username": "mallory",
                "email": "mallory@example.com",
                "password": "secret1pass",
            },
        )
        other = client.post(
            "/api/auth/login", json={"username": "mallory", "password": "secret1pass"}
        ).json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other}"}

        assert (
            client.get(
                f"/api/snippets/{created['id']}", headers=other_headers
            ).status_code
            == 404
        )
        assert (
            client.put(
                f"/api/snippets/{created['id']}", headers=other_headers, json=SNIPPET
            ).status_code
            == 404
        )
        assert (
            client.delete(
                f"/api/snippets/{created['id']}", headers=other_headers
            ).status_code
            == 404
        )

    def test_list_only_shows_own_snippets(self, client, auth_headers):
        client.post("/api/snippets", headers=auth_headers, json=SNIPPET)

        client.post(
            "/api/auth/register",
            json={
                "username": "dave2",
                "email": "dave2@example.com",
                "password": "secret1pass",
            },
        )
        other = client.post(
            "/api/auth/login", json={"username": "dave2", "password": "secret1pass"}
        ).json()["access_token"]
        other_items = client.get(
            "/api/snippets", headers={"Authorization": f"Bearer {other}"}
        ).json()["items"]
        assert other_items == []
