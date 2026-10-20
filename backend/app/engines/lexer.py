"""Lexical analyzer for ZubaanScript.

Turns source text into a flat token stream, tracking 1-indexed line and
column. Lexing is error-tolerant: an unknown character, a malformed number,
or a bad string escape records a diagnostic and continues, so a single run
surfaces every lexeme problem instead of only the first.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.engines.errors import CompilerError
from app.engines.keywords import classify_identifier
from app.engines.tokens import (
    COMMENT,
    EOF,
    FLOAT_LIT,
    INT_LIT,
    OPERATOR,
    OPERATORS,
    PUNCTUATION,
    PUNCTUATION_CHARS,
    STR_LIT,
    TOKEN_TYPES,
    Token,
    TokenSummary,
)

PHASE = "lexer"
_IDENT_CONTINUE = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
_ESCAPES = {'"': '"', "\\": "\\", "n": "\n", "t": "\t"}


@dataclass
class LexResult:
    tokens: list[Token] = field(default_factory=list)
    summary: TokenSummary = field(default_factory=TokenSummary)
    errors: list[CompilerError] = field(default_factory=list)

    @property
    def status(self) -> str:
        return "error" if self.errors else "success"

    def to_dict(self) -> dict:
        return {
            "tokens": [token.to_dict() for token in self.tokens],
            "summary": self.summary.to_dict(),
            "errors": [error.to_dict() for error in self.errors],
        }


class _Lexer:
    def __init__(self, code: str) -> None:
        self.code = code
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: list[Token] = []
        self.errors: list[CompilerError] = []

    def _advance(self) -> str:
        ch = self.code[self.pos]
        self.pos += 1
        if ch == "\n":
            self.line += 1
            self.column = 1
        else:
            self.column += 1
        return ch

    def _peek(self, offset: int = 0) -> str:
        index = self.pos + offset
        return self.code[index] if index < len(self.code) else ""

    def _emit(self, type: str, value: str, line: int, column: int) -> None:
        self.tokens.append(Token(type=type, value=value, line=line, column=column))

    def _error(self, message: str, line: int, column: int) -> None:
        self.errors.append(CompilerError(message, line, column, "error", PHASE))

    def run(self) -> LexResult:
        while self.pos < len(self.code):
            ch = self._peek()
            line, column = self.line, self.column
            if ch in " \t\r\n":
                self._advance()
            elif ch == "#":
                self._lex_comment(line, column)
            elif ch == '"':
                self._lex_string(line, column)
            elif ch.isdigit():
                self._lex_number(line, column)
            elif ch == "_" or ch.isalpha():
                self._lex_identifier(line, column)
            else:
                self._lex_operator_or_punctuation(line, column)

        self._emit(EOF, "", self.line, self.column)
        summary = TokenSummary(total=len(self.tokens), by_type=self._summarise())
        return LexResult(tokens=self.tokens, summary=summary, errors=self.errors)

    def _summarise(self) -> dict[str, int]:
        counts = {token_type: 0 for token_type in TOKEN_TYPES}
        for token in self.tokens:
            counts[token.type] += 1
        return counts

    def _lex_comment(self, line: int, column: int) -> None:
        text = ""
        while self.pos < len(self.code) and self._peek() != "\n":
            text += self._advance()
        self._emit(COMMENT, text, line, column)

    def _lex_string(self, line: int, column: int) -> None:
        self._advance()  # opening quote
        value = ""
        while self.pos < len(self.code):
            ch = self._advance()
            if ch == '"':
                self._emit(STR_LIT, value, line, column)
                return
            if ch == "\\":
                if self.pos >= len(self.code):
                    break
                escape_line, escape_column = self.line, self.column
                escaped = self._advance()
                if escaped in _ESCAPES:
                    value += _ESCAPES[escaped]
                else:
                    value += escaped
                    self._error(
                        f"Invalid escape sequence '\\{escaped}' in string",
                        escape_line,
                        escape_column,
                    )
                continue
            if ch == "\n":
                break
            value += ch

        self._error("Unterminated string literal", line, column)

    def _lex_number(self, line: int, column: int) -> None:
        text = ""
        while self._peek().isdigit():
            text += self._advance()
        if self._peek() == ".":
            text += self._advance()
            if not self._peek().isdigit():
                self._error(f"Malformed number '{text}'", line, column)
                return
            while self._peek().isdigit():
                text += self._advance()
            self._emit(FLOAT_LIT, text, line, column)
            return
        self._emit(INT_LIT, text, line, column)

    def _lex_identifier(self, line: int, column: int) -> None:
        text = ""
        while self.pos < len(self.code) and self._peek() in _IDENT_CONTINUE:
            text += self._advance()
        self._emit(classify_identifier(text), text, line, column)

    def _lex_operator_or_punctuation(self, line: int, column: int) -> None:
        for operator in OPERATORS:
            if self.code.startswith(operator, self.pos):
                for _ in operator:
                    self._advance()
                self._emit(OPERATOR, operator, line, column)
                return
        ch = self._peek()
        if ch in PUNCTUATION_CHARS:
            self._advance()
            self._emit(PUNCTUATION, ch, line, column)
            return
        self._advance()
        self._error(f"Unexpected character '{ch}'", line, column)


def lex(code: str) -> LexResult:
    """Tokenize ``code``. Never raises on bad input — diagnostics are collected."""
    return _Lexer(code).run()
