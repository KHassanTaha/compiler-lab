"""Phase 5 — engine routers, examples, and grammar.

Verifies the one-action-one-row logging contract (the run-all case is the
one most likely to regress), the duration_ms-in-result_json rule, the
worst-case status / summed error_count aggregation, the code-length limit,
and the examples/grammar endpoints.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Run

VALID = "int x = 5; likho(x);"
BROKEN = "int x = 5"  # missing ';' → parser and every downstream stage error


def run_rows():
    with SessionLocal() as db:
        return db.scalars(select(Run).order_by(Run.id)).all()


class TestSingleEngineEndpoints:
    def test_lex_returns_engine_result_and_logs_one_row(self, client, auth_headers):
        before = len(run_rows())
        response = client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": VALID}
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["engine"] == "lexer"
        assert body["status"] == "success"
        assert isinstance(body["duration_ms"], (int, float))
        assert body["run_id"] is not None
        assert body["data"]["tokens"]

        rows = run_rows()
        assert len(rows) == before + 1
        assert rows[-1].engine == "lexer"
        assert rows[-1].action == "engine_run"

    def test_parse_semantic_icg_log_their_own_engine(self, client, auth_headers):
        for path, engine in (
            ("/api/engines/parse", "parser"),
            ("/api/engines/semantic", "semantic"),
            ("/api/engines/icg", "icg"),
        ):
            before = len(run_rows())
            response = client.post(path, headers=auth_headers, json={"code": VALID})
            assert response.status_code == 200, response.text
            assert response.json()["engine"] == engine
            assert len(run_rows()) == before + 1
            assert run_rows()[-1].engine == engine

    def test_error_status_and_count(self, client, auth_headers):
        response = client.post(
            "/api/engines/parse", headers=auth_headers, json={"code": BROKEN}
        )
        body = response.json()
        assert body["status"] == "error"
        assert body["error_count"] >= 1
        assert body["errors"][0]["phase"] == "parser"

    def test_duration_lives_in_result_json_not_a_column(self, client, auth_headers):
        client.post("/api/engines/lex", headers=auth_headers, json={"code": VALID})
        row = run_rows()[-1]
        assert "duration_ms" not in Run.__table__.columns
        assert "duration_ms" in row.result_json["lexer"]

    def test_requires_auth(self, client):
        assert client.post("/api/engines/lex", json={"code": VALID}).status_code == 401


class TestRunAll:
    def test_writes_exactly_one_row_engine_all(self, client, auth_headers):
        before = len(run_rows())
        response = client.post(
            "/api/engines/run-all", headers=auth_headers, json={"code": VALID}
        )
        assert response.status_code == 200, response.text

        rows = run_rows()
        assert len(rows) == before + 1
        assert rows[-1].engine == "all"

    def test_response_has_four_results_and_one_top_level_run_id(
        self, client, auth_headers
    ):
        body = client.post(
            "/api/engines/run-all", headers=auth_headers, json={"code": VALID}
        ).json()
        assert set(body) == {"lex", "parse", "semantic", "icg", "run_id"}
        for key in ("lex", "parse", "semantic", "icg"):
            assert body[key]["run_id"] is None, "pin B6: nested results omit run_id"
        assert body["run_id"] is not None

    def test_status_is_worst_case_and_error_count_is_sum(self, client, auth_headers):
        body = client.post(
            "/api/engines/run-all", headers=auth_headers, json={"code": BROKEN}
        ).json()
        assert body["lex"]["status"] == "success"
        assert body["parse"]["status"] == "error"
        assert body["semantic"]["status"] == "error"
        assert body["icg"]["status"] == "error"

        row = run_rows()[-1]
        assert row.status == "error"
        expected = sum(
            body[k]["error_count"] for k in ("lex", "parse", "semantic", "icg")
        )
        assert row.error_count == expected

    def test_result_json_is_keyed_by_engine(self, client, auth_headers):
        client.post("/api/engines/run-all", headers=auth_headers, json={"code": VALID})
        row = run_rows()[-1]
        assert set(row.result_json) == {"lexer", "parser", "semantic", "icg"}


class TestCodeLimit:
    def test_code_over_10000_chars_is_422(self, client, auth_headers):
        response = client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": "a" * 10001}
        )
        assert response.status_code == 422

    def test_empty_code_is_valid(self, client, auth_headers):
        response = client.post(
            "/api/engines/lex", headers=auth_headers, json={"code": ""}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"


class TestExamplesAndGrammar:
    def test_examples_are_public(self, client):
        response = client.get("/api/examples")
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 7
        assert {"id", "title", "category", "code"} <= set(items[0])

    def test_examples_compile_as_their_category_promises(self, client, auth_headers):
        for example in client.get("/api/examples").json()["items"]:
            body = client.post(
                "/api/engines/run-all",
                headers=auth_headers,
                json={"code": example["code"]},
            ).json()
            statuses = {body[k]["status"] for k in ("lex", "parse", "semantic", "icg")}
            if example["category"] == "valid":
                assert statuses == {"success"}, f"{example['id']} should be fully valid"
            else:
                assert "error" in statuses, f"{example['id']} should produce an error"

    def test_grammar_requires_auth(self, client):
        assert client.get("/api/grammar").status_code == 401

    def test_grammar_returns_entries(self, client, auth_headers):
        response = client.get("/api/grammar", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()["items"]
        assert items
        assert {"non_terminal", "production", "example"} <= set(items[0])
