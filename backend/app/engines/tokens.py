"""Token dataclass and token-type constants.

A token carries its source position (1-indexed line and column) so every
downstream error can point at the exact character that caused it.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Token types produced by the lexer.
KEYWORD = "KEYWORD"
TYPE = "TYPE"
IDENT = "IDENT"
INT_LIT = "INT_LIT"
FLOAT_LIT = "FLOAT_LIT"
STR_LIT = "STR_LIT"
BOOL_LIT = "BOOL_LIT"
OPERATOR = "OPERATOR"
PUNCTUATION = "PUNCTUATION"
COMMENT = "COMMENT"
EOF = "EOF"

#: Every token type, in a stable order (used for the summary ``by_type`` table).
TOKEN_TYPES: tuple[str, ...] = (
    KEYWORD,
    TYPE,
    IDENT,
    INT_LIT,
    FLOAT_LIT,
    STR_LIT,
    BOOL_LIT,
    OPERATOR,
    PUNCTUATION,
    COMMENT,
    EOF,
)

#: Operators, longest first so the lexer's greedy match is correct.
OPERATORS: tuple[str, ...] = (
    "==",
    "!=",
    "<=",
    ">=",
    "->",
    "=",
    "+",
    "-",
    "*",
    "/",
    "%",
    "<",
    ">",
)

#: Punctuation characters.
PUNCTUATION_CHARS: tuple[str, ...] = ("(", ")", "{", "}", ";", ",", ":")


@dataclass
class Token:
    type: str
    value: str
    line: int
    column: int

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "value": self.value,
            "line": self.line,
            "column": self.column,
        }


@dataclass
class TokenSummary:
    total: int = 0
    by_type: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {"total": self.total, "by_type": self.by_type}
