"""Semantic tests (PRD §18.1).

Covers every required check: declaration/use, redeclaration vs shadowing,
the operator type table, division by a zero literal, call arity and argument
types, unused-variable warnings, undefined function calls, return-outside-
function and return-type mismatch, plus multi-scope symbol tables and
function parameter scope isolation.
"""

from app.engines.semantic import analyze


def messages(result, severity=None):
    return [
        e.message for e in result.errors if severity is None or e.severity == severity
    ]


def has_error(result, fragment):
    return any(fragment in message for message in messages(result, "error"))


class TestSemantic_Declarations:
    def test_declared_and_used_is_clean(self):
        result = analyze("int x = 5; likho(x);")
        assert result.status == "success", messages(result)

    def test_undeclared_use_is_error(self):
        result = analyze("likho(y);")
        assert result.status == "error"
        assert has_error(result, "not declared")

    def test_use_before_declaration_is_error(self):
        result = analyze("likho(x); int x = 1;")
        assert has_error(result, "not declared")

    def test_redeclaration_in_same_scope_is_error(self):
        result = analyze("int x = 1; int x = 2;")
        assert has_error(result, "already declared")

    def test_shadowing_nested_scope_is_allowed(self):
        result = analyze("int x = 1; { int x = 2; likho(x); } likho(x);")
        assert result.status == "success", messages(result)

    def test_assignment_to_undeclared_is_error(self):
        result = analyze("y = 5;")
        assert has_error(result, "not declared")

    def test_unused_variable_is_warning_not_error(self):
        result = analyze("int unused = 5;")
        assert result.status == "success"
        assert any("never used" in message for message in messages(result, "warning"))


class TestSemantic_Types:
    def test_declaration_type_mismatch(self):
        result = analyze('int x = "hello";')
        assert has_error(result, "Cannot assign")

    def test_assignment_type_mismatch(self):
        result = analyze('int x = 1; x = "hello";')
        assert has_error(result, "Cannot assign")

    def test_int_plus_float_is_error_no_coercion(self):
        result = analyze("int x = 1; float y = 1 + 2.0;")
        assert has_error(result, "matching numeric operands")

    def test_string_concatenation_is_allowed(self):
        result = analyze('string a = "x"; string b = "y"; string c = a + b; likho(c);')
        assert result.status == "success", messages(result)

    def test_string_minus_string_is_error(self):
        result = analyze('string a = "x"; string b = "y"; likho(a - b);')
        assert result.status == "error"

    def test_string_ordering_is_error(self):
        result = analyze('likho("a" < "b");')
        assert result.status == "error"

    def test_modulo_on_float_is_error(self):
        result = analyze("float x = 5.0 % 2.0;")
        assert result.status == "error"

    def test_logical_requires_bool(self):
        result = analyze("likho(1 aur 2);")
        assert result.status == "error"

    def test_unary_minus_requires_number(self):
        result = analyze('likho(-"x");')
        assert result.status == "error"

    def test_equality_requires_matching_types(self):
        result = analyze('likho(1 == "x");')
        assert result.status == "error"

    def test_equality_same_type_is_bool(self):
        result = analyze("bool b = 1 == 2; likho(b);")
        assert result.status == "success", messages(result)


class TestSemantic_DivisionByZero:
    def test_division_by_zero_literal(self):
        result = analyze("int x = 10 / 0;")
        assert has_error(result, "Division by zero")

    def test_modulo_by_zero_literal(self):
        result = analyze("int x = 10 % 0;")
        assert has_error(result, "Division by zero")

    def test_division_by_variable_is_not_flagged(self):
        result = analyze("int z = 0; int x = 10 / z;")
        assert result.status == "success", messages(result)


class TestSemantic_Functions:
    def test_function_call_ok(self):
        result = analyze(
            "kaam add(a: int, b: int) -> int { wapas a + b; } int r = add(1, 2); likho(r);"
        )
        assert result.status == "success", messages(result)

    def test_wrong_arity_is_error(self):
        result = analyze(
            "kaam add(a: int, b: int) -> int { wapas a + b; } likho(add(1));"
        )
        assert has_error(result, "expects 2 argument")

    def test_argument_type_mismatch(self):
        result = analyze('kaam add(a: int) -> int { wapas a; } likho(add("x"));')
        assert has_error(result, "expects int")

    def test_undefined_function_call_is_error(self):
        result = analyze("likho(missing());")
        assert has_error(result, "is not defined")

    def test_return_type_mismatch(self):
        result = analyze('kaam f() -> int { wapas "x"; }')
        assert has_error(result, "Return type mismatch")

    def test_bare_return_is_error(self):
        result = analyze("kaam f() -> int { wapas; }")
        assert has_error(result, "Return requires a value")

    def test_return_outside_function_is_error(self):
        result = analyze("wapas 5;")
        assert has_error(result, "Return outside function")

    def test_duplicate_parameter_is_error(self):
        result = analyze("kaam f(a: int, a: int) -> int { wapas a; }")
        assert has_error(result, "Duplicate parameter")

    def test_parameter_scope_isolation(self):
        # 'n' is only visible inside sum, not in the global scope.
        result = analyze("kaam sum(n: int) -> int { wapas n; } likho(n);")
        assert has_error(result, "not declared")

    def test_function_call_before_declaration_is_error(self):
        result = analyze("likho(f()); kaam f() -> int { wapas 1; }")
        assert has_error(result, "is not defined")


class TestSemantic_ControlFlow:
    def test_if_condition_must_be_bool(self):
        result = analyze("agar (1) { }")
        assert has_error(result, "If condition must be bool")

    def test_while_condition_must_be_bool(self):
        result = analyze("jabtak (1) { }")
        assert has_error(result, "While condition must be bool")

    def test_for_bounds_must_be_int(self):
        result = analyze("har i se 0.0 tak 5 { }")
        assert has_error(result, "start bound must be int")

    def test_for_counter_is_int_in_scope(self):
        result = analyze("har i se 0 tak 5 { likho(i); }")
        assert result.status == "success", messages(result)


class TestSemantic_Output:
    def test_symbol_table_records_scope_and_used_flag(self):
        result = analyze("int n = 5; likho(n);")
        entry = next(s for s in result.symbol_table if s.name == "n")
        assert entry.scope == "global"
        assert entry.type == "int"
        assert entry.used is True

    def test_multi_scope_symbol_table(self):
        result = analyze("int a = 1; { int b = 2; likho(b); } likho(a);")
        scopes = {symbol.scope for symbol in result.symbol_table}
        assert "global" in scopes
        assert len(scopes) >= 2

    def test_empty_program_is_success(self):
        result = analyze("")
        assert result.status == "success"
        assert result.symbol_table == []

    def test_parser_errors_surface_through_analyze(self):
        result = analyze("int x = 5")
        assert result.status == "error"
        assert any(e.phase == "parser" for e in result.errors)
