"""Phase 6 — admin access control, filters, users, stats, and redo attribution.

The 403 test protects the whole admin surface; the redo test protects the
rule that a redo run is attributed to the acting admin, not the original
user (a subtle correctness requirement).
"""


def admin_headers(client):
    token = client.post(
        "/api/auth/login", json={"username": "admin", "password": "Admin@123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def seed(client, headers, engine="lex", code="int x = 1;"):
    return client.post(
        f"/api/engines/{engine}", headers=headers, json={"code": code}
    ).json()


class TestAdminAccess:
    def test_non_admin_gets_403(self, client, auth_headers):
        for path in ("/api/admin/runs", "/api/admin/users", "/api/admin/stats"):
            assert client.get(path, headers=auth_headers).status_code == 403

    def test_unauthenticated_gets_401(self, client):
        assert client.get("/api/admin/stats").status_code == 401

    def test_admin_can_access(self, client):
        assert (
            client.get("/api/admin/stats", headers=admin_headers(client)).status_code
            == 200
        )


class TestAdminRuns:
    def test_admin_sees_all_users_runs(self, client, auth_headers):
        seed(client, auth_headers)
        body = client.get("/api/admin/runs", headers=admin_headers(client)).json()
        assert body["total"] >= 1

    def test_filter_by_user_id(self, client, auth_headers):
        seed(client, auth_headers)
        body = client.get(
            "/api/admin/runs?user_id=2", headers=admin_headers(client)
        ).json()
        assert all(item["user_id"] == 2 for item in body["items"])

    def test_filter_by_username(self, client, auth_headers):
        seed(client, auth_headers)  # alice
        body = client.get(
            "/api/admin/runs?username=alice", headers=admin_headers(client)
        ).json()
        assert body["total"] >= 1
        assert all(item["username"] == "alice" for item in body["items"])

    def test_unknown_username_returns_empty(self, client):
        body = client.get(
            "/api/admin/runs?username=nobody", headers=admin_headers(client)
        ).json()
        assert body["total"] == 0

    def test_detail_has_full_code(self, client, auth_headers):
        run_id = seed(client, auth_headers)["run_id"]
        detail = client.get(
            f"/api/admin/runs/{run_id}", headers=admin_headers(client)
        ).json()
        assert detail["code"] == "int x = 1;"

    def test_missing_run_is_404(self, client):
        response = client.get("/api/admin/runs/999999", headers=admin_headers(client))
        assert response.status_code == 404


class TestAdminUsers:
    def test_users_include_run_count_and_last_active(self, client, auth_headers):
        seed(client, auth_headers)
        body = client.get("/api/admin/users", headers=admin_headers(client)).json()
        alice = next(u for u in body["items"] if u["username"] == "alice")
        assert alice["run_count"] == 1
        assert alice["last_active"] is not None

    def test_user_with_no_runs_has_null_last_active(self, client):
        body = client.get("/api/admin/users", headers=admin_headers(client)).json()
        admin = next(u for u in body["items"] if u["username"] == "admin")
        assert admin["last_active"] is None

    def test_unknown_user_detail_is_404(self, client):
        assert (
            client.get(
                "/api/admin/users/999999", headers=admin_headers(client)
            ).status_code
            == 404
        )


class TestAdminStats:
    def test_stats_shape_and_zero_case(self, client):
        body = client.get("/api/admin/stats", headers=admin_headers(client)).json()
        assert body["total_users"] >= 1
        assert body["total_runs"] == 0
        assert body["error_rate"] == 0.0
        assert body["runs_today"] == 0

    def test_error_rate_is_percentage_one_decimal(self, client, auth_headers):
        seed(client, auth_headers, "lex", "int x = 1;")  # success
        seed(client, auth_headers, "parse", "int x = 5")  # error
        body = client.get("/api/admin/stats", headers=admin_headers(client)).json()
        assert body["total_runs"] == 2
        assert body["error_rate"] == 50.0

    def test_runs_today_counts_todays_runs(self, client, auth_headers):
        seed(client, auth_headers)
        body = client.get("/api/admin/stats", headers=admin_headers(client)).json()
        assert body["runs_today"] == 1


class TestAdminRedo:
    def test_redo_run_is_attributed_to_the_admin(self, client, auth_headers):
        # alice creates a run
        original = seed(client, auth_headers)
        admin = admin_headers(client)

        # admin fetches it and re-runs the same code + engine
        fetched = client.get(
            f"/api/admin/runs/{original['run_id']}", headers=admin
        ).json()
        segment = fetched["engine"].replace("lexer", "lex").replace("parser", "parse")
        redo = client.post(
            f"/api/engines/{segment}", headers=admin, json={"code": fetched["code"]}
        ).json()

        # the new row belongs to the admin (user id 1), not alice (2)
        redo_row = client.get(f"/api/admin/runs/{redo['run_id']}", headers=admin).json()
        assert redo_row["user_id"] == 1
        assert redo_row["username"] == "admin"
        assert redo_row["code"] == "int x = 1;"
