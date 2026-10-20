"""Lexer tests (PRD §18.1).

Every token type, position accuracy, comment/string/number edge cases, and
the error-and-continue policy each get a dedicated case. The tests assert
against the real ``Token`` fields (``type``/``value``/``line``/``column``).
"""

from app.engines.lexer import lex
from app.engines.tokens import EOF


def values(result):
    return [token.value for token in result.tokens]


def types(result):
    return [token.type for token in result.tokens]


class TestLexer_Happy:
    def test_empty_input_yields_only_eof(self):
        result = lex("")
        assert types(result) == [EOF]
        assert result.status == "success"

    def test_whitespace_only_yields_only_eof(self):
        result = lex("   \n\t  \r\n ")
        assert types(result) == [EOF]
        assert result.status == "success"

    def test_each_literal_type(self):
        result = lex('int x = 42; float y = 3.14; string s = "hi"; bool b = sach;')
        assert types(result) == [
            "TYPE",
            "IDENT",
            "OPERATOR",
            "INT_LIT",
            "PUNCTUATION",
            "TYPE",
            "IDENT",
            "OPERATOR",
            "FLOAT_LIT",
            "PUNCTUATION",
            "TYPE",
            "IDENT",
            "OPERATOR",
            "STR_LIT",
            "PUNCTUATION",
            "TYPE",
            "IDENT",
            "OPERATOR",
            "BOOL_LIT",
            "PUNCTUATION",
            EOF,
        ]

    def test_keywords_classified(self):
        result = lex("agar warna jabtak har se tak kaam wapas likho aur ya nahi")
        assert types(result)[:12] == ["KEYWORD"] * 12

    def test_bool_literals_are_not_keywords(self):
        result = lex("sach jhoot")
        assert types(result) == ["BOOL_LIT", "BOOL_LIT", EOF]
        assert values(result)[:2] == ["sach", "jhoot"]

    def test_identifier_versus_keyword_disambiguation(self):
        result = lex("int x = agar; int agarx = 1;")
        assert "agar" in values(result)
        agar_index = values(result).index("agar")
        assert types(result)[agar_index] == "KEYWORD"
        agarx_index = values(result).index("agarx")
        assert types(result)[agarx_index] == "IDENT"

    def test_string_with_escapes(self):
        result = lex(r'"a\"b\\c\nd\te"')
        assert values(result)[0] == 'a"b\\c\nd\te'

    def test_unicode_in_string(self):
        result = lex('"नमस्ते 🚀"')
        assert values(result)[0] == "नमस्ते 🚀"

    def test_summary_counts(self):
        result = lex("int x = 5;")
        assert result.summary.total == len(result.tokens)
        assert result.summary.by_type["INT_LIT"] == 1
        assert result.summary.by_type["EOF"] == 1


class TestLexer_Operators:
    def test_longest_match_operators(self):
        result = lex("== != <= >= -> - < > %")
        assert values(result)[:9] == ["==", "!=", "<=", ">=", "->", "-", "<", ">", "%"]

    def test_nested_punctuation(self):
        result = lex("( { :")
        assert [t.value for t in result.tokens if t.type == "PUNCTUATION"] == [
            "(",
            "{",
            ":",
        ]

    def test_single_equals_is_operator_not_double(self):
        result = lex("a = b")
        assert values(result)[1] == "="


class TestLexer_Positions:
    def test_line_and_column_are_one_indexed(self):
        result = lex("int x\nfloat y")
        int_token = result.tokens[0]
        assert (int_token.line, int_token.column) == (1, 1)
        float_token = result.tokens[2]
        assert (float_token.line, float_token.column) == (2, 1)

    def test_column_advances_within_line(self):
        result = lex("  int")
        assert (result.tokens[0].line, result.tokens[0].column) == (1, 3)


class TestLexer_Comments:
    def test_comment_emitted_as_token(self):
        result = lex("# hello\nint x = 1;")
        assert result.tokens[0].type == "COMMENT"
        assert result.tokens[0].value == "# hello"

    def test_comment_at_eof_without_newline(self):
        result = lex("int x = 1; # trailing")
        assert result.tokens[-2].type == "COMMENT"
        assert result.status == "success"


class TestLexer_Errors:
    def test_unterminated_string(self):
        result = lex('"abc')
        assert result.status == "error"
        assert "Unterminated string" in result.errors[0].message

    def test_invalid_escape(self):
        result = lex(r'"a\qb"')
        assert result.status == "error"
        assert "Invalid escape" in result.errors[0].message

    def test_malformed_number(self):
        result = lex("int x = 1.;")
        assert result.status == "error"
        assert "Malformed number" in result.errors[0].message

    def test_unknown_character_continues(self):
        result = lex("int @ x")
        assert result.status == "error"
        assert "Unexpected character" in result.errors[0].message
        # Lexing continues past the bad character.
        assert "int" in values(result) and "x" in values(result)

    def test_multiple_errors_collected(self):
        result = lex("@ $ ~")
        assert len(result.errors) == 3


class TestLexer_Perf:
    def test_long_token_stream_is_fast(self):
        code = "int x = 1;\n" * 2000
        result = lex(code)
        assert result.status == "success"
        assert result.summary.by_type["INT_LIT"] == 2000
