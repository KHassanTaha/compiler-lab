"""Structured grammar reference, served via ``GET /grammar``.

Each entry is ``{non_terminal, production, example}``. The productions are
transcribed from the language specification's EBNF; the examples are short
snippets in Hinglish that the frontend shows beside each rule.
"""

GRAMMAR_REFERENCE: list[dict] = [
    {
        "non_terminal": "program",
        "production": "program ::= statement* EOF",
        "example": "int x = 5; likho(x);",
    },
    {
        "non_terminal": "statement",
        "production": (
            "statement ::= varDecl | assignStmt | ifStmt | whileStmt | forStmt "
            "| funcDecl | returnStmt | printStmt | exprStmt | block"
        ),
        "example": "kaam f() -> int { wapas 1; }",
    },
    {
        "non_terminal": "block",
        "production": 'block ::= "{" statement* "}"',
        "example": "{ int x = 1; likho(x); }",
    },
    {
        "non_terminal": "varDecl",
        "production": 'varDecl ::= TYPE IDENT "=" expr ";"',
        "example": "int total = 0;",
    },
    {
        "non_terminal": "assignStmt",
        "production": 'assignStmt ::= IDENT "=" expr ";"',
        "example": "total = total + 1;",
    },
    {
        "non_terminal": "ifStmt",
        "production": 'ifStmt ::= IF "(" expr ")" block (ELSE (ifStmt | block))?',
        "example": "agar (x < 0) { likho(0); } warna { likho(x); }",
    },
    {
        "non_terminal": "whileStmt",
        "production": 'whileStmt ::= WHILE "(" expr ")" block',
        "example": "jabtak (i <= n) { i = i + 1; }",
    },
    {
        "non_terminal": "forStmt",
        "production": "forStmt ::= FOR IDENT FROM expr TO expr block",
        "example": "har i se 0 tak 10 { likho(i); }",
    },
    {
        "non_terminal": "funcDecl",
        "production": 'funcDecl ::= DEF IDENT "(" paramList? ")" "->" TYPE block',
        "example": "kaam sum(n: int) -> int { wapas n; }",
    },
    {
        "non_terminal": "paramList",
        "production": 'paramList ::= param ("," param)*',
        "example": "kaam f(a: int, b: int) -> int { wapas a + b; }",
    },
    {
        "non_terminal": "param",
        "production": 'param ::= IDENT ":" TYPE',
        "example": "n: int",
    },
    {
        "non_terminal": "returnStmt",
        "production": 'returnStmt ::= RETURN expr? ";"',
        "example": "wapas total;",
    },
    {
        "non_terminal": "printStmt",
        "production": 'printStmt ::= PRINT "(" expr ")" ";"',
        "example": "likho(result);",
    },
    {
        "non_terminal": "exprStmt",
        "production": 'exprStmt ::= expr ";"',
        "example": "sum(1, 2);",
    },
    {
        "non_terminal": "expr",
        "production": "expr ::= orExpr",
        "example": "a + b * 2",
    },
    {
        "non_terminal": "orExpr",
        "production": "orExpr ::= andExpr (OR andExpr)*",
        "example": "sach ya jhoot",
    },
    {
        "non_terminal": "andExpr",
        "production": "andExpr ::= eqExpr (AND eqExpr)*",
        "example": "x > 0 aur x < 10",
    },
    {
        "non_terminal": "eqExpr",
        "production": "eqExpr ::= relExpr ((EQ | NEQ) relExpr)*",
        "example": "a == b",
    },
    {
        "non_terminal": "relExpr",
        "production": "relExpr ::= addExpr ((LT | GT | LE | GE) addExpr)*",
        "example": "i <= n",
    },
    {
        "non_terminal": "addExpr",
        "production": "addExpr ::= mulExpr ((PLUS | MINUS) mulExpr)*",
        "example": "a + b - c",
    },
    {
        "non_terminal": "mulExpr",
        "production": "mulExpr ::= unaryExpr ((MUL | DIV | MOD) unaryExpr)*",
        "example": "a * b / 2",
    },
    {
        "non_terminal": "unaryExpr",
        "production": "unaryExpr ::= (NOT | MINUS) unaryExpr | primary",
        "example": "-x",
    },
    {
        "non_terminal": "primary",
        "production": (
            "primary ::= INT_LIT | FLOAT_LIT | STR_LIT | TRUE | FALSE | IDENT "
            '| IDENT "(" argList? ")" | "(" expr ")"'
        ),
        "example": "fib(10)",
    },
    {
        "non_terminal": "argList",
        "production": 'argList ::= expr ("," expr)*',
        "example": "1, 2, 3",
    },
    {
        "non_terminal": "TYPE",
        "production": 'TYPE ::= "int" | "float" | "string" | "bool"',
        "example": "int",
    },
]
