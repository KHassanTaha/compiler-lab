"""Parser tests (PRD §18.1).

Every statement form, nested blocks, the empty program, control-flow
variants, functions with and without parameters, calls with and without
arguments, each required syntax error, panic recovery producing multiple
errors, tree-shape correctness, and a no-infinite-loop guard.
"""

from app.engines.parser import parse

VALID_PROGRAM = """
kaam sum(n: int) -> int {
    int total = 0;
    int i = 1;
    jabtak (i <= n) {
        total = total + i;
        i = i + 1;
    }
    wapas total;
}
int n = 10;
int result = sum(n);
likho(result);
"""


def find(node, type_name):
    """Depth-first search for the first node of a given type."""
    if node is None:
        return None
    if node.type == type_name:
        return node
    for child in node.children:
        found = find(child, type_name)
        if found is not None:
            return found
    return None


class TestParser_Happy:
    def test_reference_program_parses_clean(self):
        result = parse(VALID_PROGRAM)
        assert result.status == "success", result.errors
        assert result.tree is not None
        assert result.tree.type == "Program"

    def test_empty_program_is_valid(self):
        result = parse("")
        assert result.status == "success"
        assert result.tree.type == "Program"
        assert result.tree.children == []

    def test_every_statement_type(self):
        result = parse(
            "int a = 1; a = 2; agar (sach) { likho(a); } jabtak (jhoot) { } "
            "har i se 0 tak 5 { } kaam f() -> int { wapas 1; } likho(a); a + 1;"
        )
        assert result.status == "success", result.errors
        seen = set()

        def collect(node):
            seen.add(node.type)
            for child in node.children:
                collect(child)

        collect(result.tree)
        assert {
            "VarDecl",
            "Assign",
            "If",
            "While",
            "For",
            "FuncDecl",
            "Return",
            "Print",
            "ExprStmt",
        } <= seen

    def test_nested_blocks(self):
        result = parse("agar (sach) { agar (sach) { agar (sach) { } } }")
        assert result.status == "success"
        assert find(result.tree, "Block") is not None

    def test_if_without_else(self):
        result = parse("agar (sach) { }")
        assert result.status == "success"
        assert len(find(result.tree, "If").children) == 2  # condition + block

    def test_if_else_if_else_chain(self):
        result = parse("agar (sach) { } warna agar (jhoot) { } warna { }")
        assert result.status == "success"
        outer = find(result.tree, "If")
        assert len(outer.children) == 3
        assert outer.children[2].type == "If"

    def test_function_with_and_without_params(self):
        result = parse(
            "kaam f(a: int, b: float) -> int { wapas a; } kaam g() -> int { wapas 1; }"
        )
        assert result.status == "success"
        params = find(result.tree, "Params")
        assert any(child.type == "Param" for child in params.children)

    def test_call_with_and_without_args(self):
        result = parse("f(); f(1, 2);")
        assert result.status == "success"
        calls = []

        def collect(node):
            if node.type == "Call":
                calls.append(node)
            for child in node.children:
                collect(child)

        collect(result.tree)
        assert len(calls) == 2
        assert len(calls[0].children) == 0
        assert len(calls[1].children) == 2


class TestParser_Tree:
    def test_binary_precedence_multiplication_binds_tighter(self):
        result = parse("int x = 1 + 2 * 3;")
        add = find(result.tree, "Binary")
        assert add.value == "+"
        assert add.children[1].value == "*"

    def test_parentheses_override_precedence(self):
        result = parse("int x = (1 + 2) * 3;")
        mul = find(result.tree, "Binary")
        assert mul.value == "*"
        assert mul.children[0].value == "+"

    def test_literal_values_are_typed(self):
        result = parse('int x = 42; float y = 3.5; string s = "hi"; bool b = sach;')
        assert find(result.tree, "IntLiteral").value == 42
        assert find(result.tree, "FloatLiteral").value == 3.5
        assert find(result.tree, "StringLiteral").value == "hi"
        assert find(result.tree, "BoolLiteral").value is True

    def test_node_positions_present(self):
        result = parse("int x = 1;")
        var = find(result.tree, "VarDecl")
        assert var.line == 1 and var.column == 1
        assert var.value == "int"


class TestParser_Serialisation:
    def test_to_dict_shape(self):
        data = parse("int x = 5;").to_dict()
        assert set(data) == {"tree", "derivation", "errors"}
        assert data["tree"]["type"] == "Program"
        assert data["tree"]["children"][0]["type"] == "VarDecl"


class TestParser_Errors:
    def test_missing_semicolon(self):
        result = parse("int x = 5")
        assert result.status == "error"
        assert any("';'" in error.message for error in result.errors)

    def test_missing_closing_paren(self):
        result = parse("agar (sach { }")
        assert result.status == "error"

    def test_missing_closing_brace(self):
        result = parse("agar (sach) { likho(1);")
        assert result.status == "error"
        assert any("'}'" in error.message for error in result.errors)

    def test_bad_param_list(self):
        result = parse("kaam f(a int) -> int { wapas 1; }")
        assert result.status == "error"
        assert any("':'" in error.message for error in result.errors)

    def test_bad_for_clause(self):
        result = parse("har i 0 tak 5 { }")
        assert result.status == "error"
        assert any("'se'" in error.message for error in result.errors)

    def test_unexpected_token_in_expression(self):
        result = parse("int x = ;")
        assert result.status == "error"
        assert any("expected an expression" in error.message for error in result.errors)

    def test_lexer_errors_surface_through_parse(self):
        result = parse("int @ = 1;")
        assert result.status == "error"
        assert any(error.phase == "lexer" for error in result.errors)


class TestParser_Recovery:
    REFERENCE_BROKEN = """
int x = 5
y = x + "hello";
kaam foo(a: int, b: int) -> int { wapas a + b; }
foo(1);
int z = 10 / 0;
"""

    MULTI_SYNTAX_ERRORS = "kaam f(a int, b int) -> int { wapas a } har i 0 9 { }"

    def test_reference_broken_program_reports_syntax_error_and_recovers(self):
        # Only the missing ';' is syntactic; the rest are semantic errors that
        # the parser is not responsible for. The parser must still recover and
        # build a tree from the remaining statements.
        result = parse(self.REFERENCE_BROKEN)
        assert result.status == "error"
        assert any("';'" in error.message for error in result.errors)
        assert result.tree is not None
        assert len(result.tree.children) >= 3

    def test_reports_at_least_three_errors_from_one_run(self):
        result = parse(self.MULTI_SYNTAX_ERRORS)
        assert result.status == "error"
        assert len(result.errors) >= 3, [e.message for e in result.errors]

    def test_recovers_and_still_builds_a_tree(self):
        result = parse(self.MULTI_SYNTAX_ERRORS)
        assert result.tree is not None
        assert result.tree.type == "Program"

    def test_pathological_input_terminates(self):
        # A stream of stray closing braces must not loop forever.
        result = parse("} } } } }" * 500)
        assert result.status == "error"

    def test_derivation_is_recorded(self):
        result = parse(VALID_PROGRAM)
        assert result.derivation
        assert {"step", "rule", "matched_text"} <= set(result.derivation[0])
