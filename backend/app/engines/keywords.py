"""Hinglish keyword and type maps for ZubaanScript.

This module is the single source of truth for how words in the source map
to token types. The lexer consults ``classify_identifier``; the parser
looks up the concrete construct with ``KEYWORD``. The frontend highlighting
mode and the grammar reference are generated from the same tables.
"""

# Control-flow / declaration keywords. The value is the keyword's role, used
# by the parser to dispatch; the lexer still reports the generic KEYWORD type.
KEYWORDS: dict[str, str] = {
    "agar": "IF",
    "warna": "ELSE",
    "jabtak": "WHILE",
    "har": "FOR",
    "se": "FROM",
    "tak": "TO",
    "kaam": "DEF",
    "wapas": "RETURN",
    "likho": "PRINT",
    "aur": "AND",
    "ya": "OR",
    "nahi": "NOT",
}

# Boolean literals are values, not keywords (pin A1): they lex as BOOL_LIT.
BOOL_LITERALS: dict[str, bool] = {"sach": True, "jhoot": False}

# Primitive type names. These lex as TYPE, not IDENT.
TYPES: set[str] = {"int", "float", "string", "bool"}

# English -> Hinglish table used by the docs page and grammar reference.
ENGLISH_TO_HINGLISH: dict[str, str] = {
    "if": "agar",
    "else": "warna",
    "while": "jabtak",
    "for": "har",
    "from": "se",
    "to": "tak",
    "def": "kaam",
    "return": "wapas",
    "print": "likho",
    "true": "sach",
    "false": "jhoot",
    "and": "aur",
    "or": "ya",
    "not": "nahi",
}


def classify_identifier(word: str) -> str:
    """Return the token *type* for a word.

    Keyword words report the generic ``KEYWORD`` type (the specific construct
    is recovered by the parser from the token's value); boolean literals and
    type names get their own types; anything else is an ``IDENT``.
    """
    if word in KEYWORDS:
        return "KEYWORD"
    if word in BOOL_LITERALS:
        return "BOOL_LIT"
    if word in TYPES:
        return "TYPE"
    return "IDENT"


def keyword_kind(word: str) -> str | None:
    """Return the parser-facing kind for a keyword word, or ``None``."""
    return KEYWORDS.get(word)
