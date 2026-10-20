"""Phase 6 — history filters, sort, pagination, and the shareable run.

Runs are seeded through the real engine endpoints so the tests exercise the
same rows the app produces, not hand-inserted fixtures.
"""


def seed_runs(client, headers, count=3):
    ids = []
    for i in range(count):
        body = client.post(
            "/api/engines/lex", headers=headers, json={"code": f"int x{i} = {i};"}
        ).json()
        ids.append(body["run_id"])
    return ids


class TestHistory:
    def test_lists_only_own_runs(self, client, auth_headers):
        seed_runs(client, auth_headers, 2)
        body = client.get("/api/history", headers=auth_headers).json()
        assert set(body) == {"items", "total", "page", "page_size", "total_pages"}
        assert body["total"] == 2
        assert all(item["engine"] == "lexer" for item in body["items"])

    def test_pagination_envelope(self, client, auth_headers):
        seed_runs(client, auth_headers, 3)
        body = client.get(
            "/api/history?page=1&page_size=2", headers=auth_headers
        ).json()
        assert len(body["items"]) == 2
        assert body["total"] == 3
        assert body["total_pages"] == 2

    def test_filter_by_engine(self, client, auth_headers):
        seed_runs(client, auth_headers, 1)
        client.post(
            "/api/engines/parse", headers=auth_headers, json={"code": "int x = 1;"}
        )
        body = client.get("/api/history?engine=parser", headers=auth_headers).json()
        assert body["total"] == 1
        assert body["items"][0]["engine"] == "parser"

    def test_filter_by_status(self, client, auth_headers):
        client.post(
            "/api/engines/parse", headers=auth_headers, json={"code": "int x = 5"}
        )
        body = client.get("/api/history?status=error", headers=auth_headers).json()
        assert body["total"] == 1

    def test_search_q_matches_code_substring(self, client, auth_headers):
        client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": "int magic = 42;"}
        )
        client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": "int other = 1;"}
        )
        body = client.get("/api/history?q=magic", headers=auth_headers).json()
        assert body["total"] == 1

    def test_sort_by_engine(self, client, auth_headers):
        client.post(
            "/api/engines/parse", headers=auth_headers, json={"code": "int x = 1;"}
        )
        client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": "int x = 1;"}
        )
        body = client.get("/api/history?sort=engine:asc", headers=auth_headers).json()
        engines = [item["engine"] for item in body["items"]]
        assert engines == sorted(engines)

    def test_invalid_sort_is_422(self, client, auth_headers):
        assert (
            client.get("/api/history?sort=bogus:desc", headers=auth_headers).status_code
            == 422
        )

    def test_summary_has_preview_not_full_code(self, client, auth_headers):
        client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": "int x = 1;"}
        )
        item = client.get("/api/history", headers=auth_headers).json()["items"][0]
        assert "code" not in item
        assert "code_preview" in item

    def test_detail_has_full_code(self, client, auth_headers):
        run_id = seed_runs(client, auth_headers, 1)[0]
        detail = client.get(f"/api/history/{run_id}", headers=auth_headers).json()
        assert detail["code"] == "int x0 = 0;"
        assert detail["result_json"] is not None

    def test_other_users_run_detail_is_404(self, client, auth_headers):
        run_id = seed_runs(client, auth_headers, 1)[0]
        client.post(
            "/api/auth/register",
            json={
                "username": "eve2",
                "email": "eve2@example.com",
                "password": "secret1pass",
            },
        )
        eve = client.post(
            "/api/auth/login", json={"username": "eve2", "password": "secret1pass"}
        ).json()["access_token"]
        response = client.get(
            f"/api/history/{run_id}", headers={"Authorization": f"Bearer {eve}"}
        )
        assert response.status_code == 404


class TestSharedRun:
    def test_any_authenticated_user_can_view(self, client, auth_headers):
        run_id = seed_runs(client, auth_headers, 1)[0]
        client.post(
            "/api/auth/register",
            json={
                "username": "viewer",
                "email": "viewer@example.com",
                "password": "secret1pass",
            },
        )
        viewer = client.post(
            "/api/auth/login", json={"username": "viewer", "password": "secret1pass"}
        ).json()["access_token"]
        response = client.get(
            f"/api/runs/{run_id}", headers={"Authorization": f"Bearer {viewer}"}
        )
        assert response.status_code == 200
        assert response.json()["code"] == "int x0 = 0;"

    def test_requires_auth(self, client, auth_headers):
        run_id = seed_runs(client, auth_headers, 1)[0]
        assert client.get(f"/api/runs/{run_id}").status_code == 401

    def test_missing_run_is_404(self, client, auth_headers):
        assert client.get("/api/runs/999999", headers=auth_headers).status_code == 404
