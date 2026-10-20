"""ICG tests (PRD §18.1).

Covers simple and chained arithmetic, if/else and while label/goto shapes,
the for-loop lowering, function declaration with call and return, nested
expression temp ordering, the best-effort contract on semantic errors,
warnings not flipping status, and empty input.
"""

from app.engines.icg import BEST_EFFORT_NOTE, generate


class TestICG_Basic:
    def test_simple_assignment(self):
        result = generate("int x = 5;")
        assert result.tac == ["x = 5"]
        assert result.status == "success"

    def test_chained_arithmetic_orders_temps(self):
        result = generate("int x = 1 + 2 * 3;")
        assert result.tac == ["t1 = 2 * 3", "t2 = 1 + t1", "x = t2"]
        assert result.temp_count == 2

    def test_nested_expression_temp_order(self):
        result = generate("int x = (1 + 2) * (3 + 4);")
        assert result.tac == ["t1 = 1 + 2", "t2 = 3 + 4", "t3 = t1 * t2", "x = t3"]

    def test_assignment_uses_existing_variable(self):
        result = generate("int x = 1; x = 2;")
        assert result.tac == ["x = 1", "x = 2"]

    def test_empty_program_yields_empty_tac(self):
        result = generate("")
        assert result.tac == []
        assert result.status == "success"
        assert result.temp_count == 0
        assert result.label_count == 0

    def test_print_and_return(self):
        result = generate("likho(1 + 2);")
        assert result.tac == ["t1 = 1 + 2", "print t1"]


class TestICG_ControlFlow:
    def test_if_without_else(self):
        result = generate("agar (sach) { likho(1); }")
        assert result.tac == ["ifFalse sach goto L1", "print 1", "L1:"]
        assert result.label_count == 1

    def test_if_else_labels_and_gotos(self):
        result = generate("agar (sach) { likho(1); } warna { likho(2); }")
        assert result.tac == [
            "ifFalse sach goto L1",
            "print 1",
            "goto L2",
            "L1:",
            "print 2",
            "L2:",
        ]
        assert result.label_count == 2

    def test_while_labels_and_gotos(self):
        result = generate("int i = 0; jabtak (i < 3) { i = i + 1; }")
        assert result.tac == [
            "i = 0",
            "L1:",
            "t1 = i < 3",
            "ifFalse t1 goto L2",
            "t2 = i + 1",
            "i = t2",
            "goto L1",
            "L2:",
        ]

    def test_for_lowered_form(self):
        result = generate("har i se 0 tak 5 { likho(i); }")
        assert result.tac == [
            "i = 0",
            "L1:",
            "t1 = i < 5",
            "ifFalse t1 goto L2",
            "print i",
            "i = i + 1",
            "goto L1",
            "L2:",
        ]
        assert result.label_count == 2


class TestICG_Functions:
    def test_function_decl_call_and_return(self):
        result = generate(
            "kaam add(a: int, b: int) -> int { wapas a + b; } likho(add(1, 2));"
        )
        assert "add:" in result.tac
        assert "t1 = a + b" in result.tac
        assert "return t1" in result.tac
        # Call emits a temp with the arg count, then the argument listings.
        assert any(line.startswith("t2 = call add, 2") for line in result.tac)

    def test_call_without_args(self):
        result = generate("kaam f() -> int { wapas 1; } likho(f());")
        assert any(line.startswith("t1 = call f, 0") for line in result.tac)


class TestICG_Serialisation:
    def test_to_dict_omits_note_when_absent(self):
        result = generate("int x = 5;")
        data = result.to_dict()
        assert "note" not in data
        assert data["tac"] == ["x = 5"]

    def test_to_dict_includes_note_on_best_effort(self):
        result = generate("int x = 10 / 0;")
        assert result.to_dict()["note"] == BEST_EFFORT_NOTE


class TestICG_BestEffort:
    def test_semantic_errors_flip_status_but_keep_tac(self):
        result = generate("int x = 10 / 0;")
        assert result.status == "error"
        assert result.tac, "TAC must still be generated"
        assert result.note == BEST_EFFORT_NOTE

    def test_undeclared_variable_still_produces_tac(self):
        result = generate("y = 1 + 2;")
        assert result.status == "error"
        assert result.tac == ["t1 = 1 + 2", "y = t1"]
        assert result.note == BEST_EFFORT_NOTE

    def test_warnings_only_keep_success_status(self):
        result = generate("int unused = 5;")
        assert result.status == "success"
        assert result.note is None
        assert any(e.severity == "warning" for e in result.errors)

    def test_errors_are_propagated_from_semantic(self):
        result = generate("int x = 10 / 0;")
        assert any("Division by zero" in e.message for e in result.errors)
