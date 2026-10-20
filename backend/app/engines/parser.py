"""Recursive-descent parser for ZubaanScript.

Consumes the token stream from the lexer and builds an AST plus a linear
derivation trace. The grammar is LL(1)-friendly: one method per
non-terminal, one token of lookahead.

Error handling is panic-mode recovery. On a syntax error the parser records
a diagnostic, then skips tokens until a sync point (``;``, ``}``, or EOF)
and resumes — so a single run reports several errors rather than stopping at
the first. A progress guard prevents an infinite loop when the token stream
cannot advance.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.engines.ast_nodes import Node
from app.engines.errors import CompilerError
from app.engines.keywords import keyword_kind
from app.engines.lexer import lex
from app.engines.tokens import (
    BOOL_LIT,
    COMMENT,
    EOF,
    FLOAT_LIT,
    IDENT,
    INT_LIT,
    KEYWORD,
    OPERATOR,
    PUNCTUATION,
    STR_LIT,
    TYPE,
    Token,
)

PHASE = "parser"
_SYNC = {";", "}"}
_TYPE_NAMES = {"int", "float", "string", "bool"}


@dataclass
class ParseResult:
    tree: Node | None = None
    derivation: list[dict] = field(default_factory=list)
    errors: list[CompilerError] = field(default_factory=list)

    @property
    def status(self) -> str:
        return "error" if self.errors else "success"

    def to_dict(self) -> dict:
        return {
            "tree": self.tree.to_dict() if self.tree is not None else None,
            "derivation": self.derivation,
            "errors": [error.to_dict() for error in self.errors],
        }


class _Parser:
    def __init__(self, tokens: list[Token]) -> None:
        self.tokens = [token for token in tokens if token.type != COMMENT]
        self.pos = 0
        self.errors: list[CompilerError] = []
        self.derivation: list[dict] = []
        self._step = 0

    # -- token helpers ---------------------------------------------------
    def _peek(self, offset: int = 0) -> Token:
        index = min(self.pos + offset, len(self.tokens) - 1)
        return self.tokens[index]

    def _at_end(self) -> bool:
        return self._peek().type == EOF

    def _advance(self) -> Token:
        token = self._peek()
        if token.type != EOF:
            self.pos += 1
        return token

    def _check(self, type: str, value: str | None = None) -> bool:
        token = self._peek()
        return token.type == type and (value is None or token.value == value)

    def _check_keyword(self, kind: str) -> bool:
        token = self._peek()
        return token.type == KEYWORD and keyword_kind(token.value) == kind

    def _match(self, type: str, value: str | None = None) -> Token | None:
        if self._check(type, value):
            return self._advance()
        return None

    def _match_keyword(self, kind: str) -> Token | None:
        if self._check_keyword(kind):
            return self._advance()
        return None

    def _error(self, message: str, token: Token, expected: str | None = None) -> None:
        self.errors.append(
            CompilerError(
                message=message,
                line=token.line,
                column=token.column,
                severity="error",
                phase=PHASE,
            )
        )

    def _expect(self, type: str, value: str | None, message: str) -> Token | None:
        token = self._match(type, value)
        if token is None:
            self._error(message, self._peek())
        return token

    def _record(self, rule: str, token: Token) -> None:
        self._step += 1
        self.derivation.append(
            {
                "step": self._step,
                "rule": rule,
                "matched_text": token.value or token.type,
            }
        )

    # -- recovery --------------------------------------------------------
    def _synchronise(self) -> None:
        while not self._at_end():
            if self._peek().type == PUNCTUATION and self._peek().value in _SYNC:
                if self._peek().value == ";":
                    self._advance()
                return
            self._advance()

    # -- entry -----------------------------------------------------------
    def parse(self) -> ParseResult:
        program = Node("Program", self._peek().line, self._peek().column)
        while not self._at_end():
            before = self.pos
            statement = self._statement()
            if statement is not None:
                program.add(statement)
            if self.pos == before:
                # No progress: force an advance to avoid an infinite loop.
                bad = self._advance()
                if statement is None and not self.errors:
                    self._error(f"Unexpected token '{bad.value}'", bad)
                self._synchronise()
        self._record("program ::= statement* EOF", self._peek())
        return ParseResult(tree=program, derivation=self.derivation, errors=self.errors)

    # -- statements ------------------------------------------------------
    def _statement(self) -> Node | None:
        token = self._peek()
        if token.type == TYPE:
            return self._var_decl()
        if token.type == KEYWORD:
            kind = keyword_kind(token.value)
            if kind == "IF":
                return self._if_stmt()
            if kind == "WHILE":
                return self._while_stmt()
            if kind == "FOR":
                return self._for_stmt()
            if kind == "DEF":
                return self._func_decl()
            if kind == "RETURN":
                return self._return_stmt()
            if kind == "PRINT":
                return self._print_stmt()
        if token.type == PUNCTUATION and token.value == "{":
            return self._block()
        if token.type in (IDENT,):
            # Assignment vs expression statement: only `IDENT =` is an assign.
            if self._peek(1).type == OPERATOR and self._peek(1).value == "=":
                return self._assign_stmt()
            return self._expr_stmt()
        if token.type in (INT_LIT, FLOAT_LIT, STR_LIT, BOOL_LIT) or (
            token.type == OPERATOR and token.value == "-"
        ):
            return self._expr_stmt()
        if token.type == PUNCTUATION and token.value == ";":
            self._advance()
            return None
        # Unparseable start of a statement.
        self._error(f"Unexpected token '{token.value}'", token)
        self._advance()
        self._synchronise()
        return None

    def _var_decl(self) -> Node:
        type_token = self._advance()
        node = Node(
            "VarDecl", type_token.line, type_token.column, value=type_token.value
        )
        self._record("varDecl ::= TYPE IDENT = expr ;", type_token)
        name = self._expect(IDENT, None, "Expected a variable name after the type")
        if name is not None:
            node.add(Node("Identifier", name.line, name.column, value=name.value))
        self._expect(OPERATOR, "=", "Expected '=' in variable declaration")
        node.add(self._expression())
        self._expect(PUNCTUATION, ";", "Expected ';' after variable declaration")
        return node

    def _assign_stmt(self) -> Node:
        name = self._advance()
        node = Node("Assign", name.line, name.column)
        self._record("assignStmt ::= IDENT = expr ;", name)
        node.add(Node("Identifier", name.line, name.column, value=name.value))
        self._advance()  # '='
        node.add(self._expression())
        self._expect(PUNCTUATION, ";", "Expected ';' after assignment")
        return node

    def _if_stmt(self) -> Node:
        keyword = self._advance()
        node = Node("If", keyword.line, keyword.column)
        self._record("ifStmt ::= IF ( expr ) block (ELSE (ifStmt | block))?", keyword)
        self._expect(PUNCTUATION, "(", "Expected '(' after 'agar'")
        node.add(self._expression())
        self._expect(PUNCTUATION, ")", "Expected ')' after the if condition")
        node.add(self._block())
        if self._match_keyword("ELSE"):
            if self._check_keyword("IF"):
                node.add(self._if_stmt())
            else:
                node.add(self._block())
        return node

    def _while_stmt(self) -> Node:
        keyword = self._advance()
        node = Node("While", keyword.line, keyword.column)
        self._record("whileStmt ::= WHILE ( expr ) block", keyword)
        self._expect(PUNCTUATION, "(", "Expected '(' after 'jabtak'")
        node.add(self._expression())
        self._expect(PUNCTUATION, ")", "Expected ')' after the while condition")
        node.add(self._block())
        return node

    def _for_stmt(self) -> Node:
        keyword = self._advance()
        node = Node("For", keyword.line, keyword.column)
        self._record("forStmt ::= FOR IDENT FROM expr TO expr block", keyword)
        counter = self._expect(IDENT, None, "Expected a loop counter name after 'har'")
        if counter is not None:
            node.add(
                Node("Identifier", counter.line, counter.column, value=counter.value)
            )
        if self._match_keyword("FROM") is None:
            self._error("Expected 'se' in for loop", self._peek())
        node.add(self._expression())
        if self._match_keyword("TO") is None:
            self._error("Expected 'tak' in for loop", self._peek())
        node.add(self._expression())
        node.add(self._block())
        return node

    def _func_decl(self) -> Node:
        keyword = self._advance()
        node = Node("FuncDecl", keyword.line, keyword.column)
        self._record("funcDecl ::= DEF IDENT ( paramList? ) -> TYPE block", keyword)
        name = self._expect(IDENT, None, "Expected a function name after 'kaam'")
        if name is not None:
            node.add(Node("Identifier", name.line, name.column, value=name.value))
        self._expect(PUNCTUATION, "(", "Expected '(' after the function name")
        params = Node("Params", self._peek().line, self._peek().column)
        if not self._check(PUNCTUATION, ")"):
            params.add(self._param())
            while self._match(PUNCTUATION, ","):
                params.add(self._param())
        node.add(params)
        self._expect(PUNCTUATION, ")", "Expected ')' to close the parameter list")
        self._expect(OPERATOR, "->", "Expected '->' before the return type")
        return_type = self._expect(TYPE, None, "Expected a return type after '->'")
        node.value = return_type.value if return_type else None
        node.add(self._block())
        return node

    def _param(self) -> Node:
        name = self._expect(IDENT, None, "Expected a parameter name")
        node = Node(
            "Param",
            name.line if name else self._peek().line,
            name.column if name else self._peek().column,
        )
        if name is not None:
            node.value = name.value
        self._expect(PUNCTUATION, ":", "Expected ':' after the parameter name")
        type_token = self._expect(TYPE, None, "Expected a parameter type after ':'")
        if type_token is not None:
            node.add(
                Node("Type", type_token.line, type_token.column, value=type_token.value)
            )
        return node

    def _return_stmt(self) -> Node:
        keyword = self._advance()
        node = Node("Return", keyword.line, keyword.column)
        self._record("returnStmt ::= RETURN expr? ;", keyword)
        if not self._check(PUNCTUATION, ";"):
            node.add(self._expression())
        self._expect(PUNCTUATION, ";", "Expected ';' after return")
        return node

    def _print_stmt(self) -> Node:
        keyword = self._advance()
        node = Node("Print", keyword.line, keyword.column)
        self._record("printStmt ::= PRINT ( expr ) ;", keyword)
        self._expect(PUNCTUATION, "(", "Expected '(' after 'likho'")
        node.add(self._expression())
        self._expect(PUNCTUATION, ")", "Expected ')' to close the print call")
        self._expect(PUNCTUATION, ";", "Expected ';' after print")
        return node

    def _expr_stmt(self) -> Node:
        expr = self._expression()
        node = Node("ExprStmt", expr.line, expr.column)
        node.add(expr)
        self._expect(PUNCTUATION, ";", "Expected ';' after expression")
        return node

    def _block(self) -> Node:
        brace = self._expect(PUNCTUATION, "{", "Expected '{' to open a block")
        line = brace.line if brace else self._peek().line
        column = brace.column if brace else self._peek().column
        node = Node("Block", line, column)
        if brace is not None:
            self._record("block ::= { statement* }", brace)
        while not self._at_end() and not self._check(PUNCTUATION, "}"):
            before = self.pos
            statement = self._statement()
            if statement is not None:
                node.add(statement)
            if self.pos == before:
                bad = self._advance()
                self._error(f"Unexpected token '{bad.value}'", bad)
                self._synchronise()
        self._expect(PUNCTUATION, "}", "Expected '}' to close the block")
        return node

    # -- expressions (precedence climbing, lowest first) -----------------
    def _expression(self) -> Node:
        return self._or_expr()

    def _or_expr(self) -> Node:
        node = self._and_expr()
        while self._check_keyword("OR"):
            operator = self._advance()
            right = self._and_expr()
            node = self._binary("Or", operator, node, right)
        return node

    def _and_expr(self) -> Node:
        node = self._equality_expr()
        while self._check_keyword("AND"):
            operator = self._advance()
            right = self._equality_expr()
            node = self._binary("And", operator, node, right)
        return node

    def _equality_expr(self) -> Node:
        node = self._relational_expr()
        while self._check(OPERATOR, "==") or self._check(OPERATOR, "!="):
            operator = self._advance()
            right = self._relational_expr()
            node = self._binary("Binary", operator, node, right)
        return node

    def _relational_expr(self) -> Node:
        node = self._additive_expr()
        while self._peek().type == OPERATOR and self._peek().value in (
            "<",
            ">",
            "<=",
            ">=",
        ):
            operator = self._advance()
            right = self._additive_expr()
            node = self._binary("Binary", operator, node, right)
        return node

    def _additive_expr(self) -> Node:
        node = self._multiplicative_expr()
        while self._peek().type == OPERATOR and self._peek().value in ("+", "-"):
            operator = self._advance()
            right = self._multiplicative_expr()
            node = self._binary("Binary", operator, node, right)
        return node

    def _multiplicative_expr(self) -> Node:
        node = self._unary_expr()
        while self._peek().type == OPERATOR and self._peek().value in ("*", "/", "%"):
            operator = self._advance()
            right = self._unary_expr()
            node = self._binary("Binary", operator, node, right)
        return node

    def _unary_expr(self) -> Node:
        if self._check(OPERATOR, "-") or self._check_keyword("NOT"):
            operator = self._advance()
            operand = self._unary_expr()
            node = Node("Unary", operator.line, operator.column, value=operator.value)
            node.add(operand)
            return node
        return self._primary()

    def _primary(self) -> Node:
        token = self._peek()

        if token.type == INT_LIT:
            self._advance()
            return Node("IntLiteral", token.line, token.column, value=int(token.value))
        if token.type == FLOAT_LIT:
            self._advance()
            return Node(
                "FloatLiteral", token.line, token.column, value=float(token.value)
            )
        if token.type == STR_LIT:
            self._advance()
            return Node("StringLiteral", token.line, token.column, value=token.value)
        if token.type == BOOL_LIT:
            self._advance()
            return Node(
                "BoolLiteral", token.line, token.column, value=(token.value == "sach")
            )

        if token.type == IDENT:
            self._advance()
            if self._check(PUNCTUATION, "("):
                return self._call(token)
            return Node("Identifier", token.line, token.column, value=token.value)

        if token.type == PUNCTUATION and token.value == "(":
            self._advance()
            inner = self._expression()
            self._expect(PUNCTUATION, ")", "Expected ')' to close the expression")
            return inner

        self._error(f"Unexpected token '{token.value}' — expected an expression", token)
        # Produce a placeholder so callers always receive a node.
        self._advance()
        return Node("Error", token.line, token.column, value=token.value)

    def _call(self, name: Token) -> Node:
        node = Node("Call", name.line, name.column, value=name.value)
        self._advance()  # '('
        if not self._check(PUNCTUATION, ")"):
            node.add(self._expression())
            while self._match(PUNCTUATION, ","):
                node.add(self._expression())
        self._expect(PUNCTUATION, ")", "Expected ')' to close argument list")
        return node

    def _binary(self, kind: str, operator: Token, left: Node, right: Node) -> Node:
        node = Node(kind, operator.line, operator.column, value=operator.value)
        node.add(left)
        node.add(right)
        return node


def parse(code: str) -> ParseResult:
    """Parse ``code`` into an AST. Lexer diagnostics are surfaced as parse errors."""
    lex_result = lex(code)
    parser = _Parser(lex_result.tokens)
    result = parser.parse()
    for lex_error in lex_result.errors:
        result.errors.insert(0, lex_error)
    return result
