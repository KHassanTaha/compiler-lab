"""Semantic analyzer for ZubaanScript.

Walks the AST produced by the parser and performs all static checks:
declaration/use, scope rules, the operator type table, call arity and
argument types, return rules, division by a literal zero, and unused-variable
warnings.

Scope model: a stack of symbol tables. A block pushes on entry and pops on
exit; a function body is a scope nested under global, with parameters
declared in that same body scope. Shadowing an outer name is allowed;
redeclaration in the *same* scope is an error.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.engines.ast_nodes import Node
from app.engines.errors import CompilerError
from app.engines.parser import parse

PHASE = "semantic"
_NUMERIC = {"int", "float"}
_INT = "int"
_BOOL = "bool"
_STRING = "string"

# Operator result rules from the specification's operator table.
_ARITHMETIC = {"+", "-", "*", "/", "%"}
_COMPARISON = {"<", ">", "<=", ">="}
_EQUALITY = {"==", "!="}


@dataclass
class Symbol:
    scope: str
    name: str
    type: str
    line: int
    used: bool = False

    def to_dict(self) -> dict:
        return {
            "scope": self.scope,
            "name": self.name,
            "type": self.type,
            "line": self.line,
            "used": self.used,
        }


@dataclass
class Scope:
    name: str
    depth: int
    symbols: list[Symbol] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "depth": self.depth,
            "symbols": [symbol.to_dict() for symbol in self.symbols],
        }


@dataclass
class FunctionInfo:
    name: str
    params: list[str]
    param_types: list[str]
    return_type: str
    line: int


@dataclass
class SemanticResult:
    symbol_table: list[Symbol] = field(default_factory=list)
    scopes: list[Scope] = field(default_factory=list)
    errors: list[CompilerError] = field(default_factory=list)

    @property
    def status(self) -> str:
        return "error" if any(e.severity == "error" for e in self.errors) else "success"

    def to_dict(self) -> dict:
        return {
            "symbol_table": [s.to_dict() for s in self.symbol_table],
            "scopes": [s.to_dict() for s in self.scopes],
            "errors": [e.to_dict() for e in self.errors],
        }


class _Analyzer:
    def __init__(self) -> None:
        self.scopes: list[Scope] = []
        self.functions: dict[str, FunctionInfo] = {}
        self.errors: list[CompilerError] = []
        self.symbols: list[Symbol] = []
        self.function_depth = 0
        self.current_return_type: str | None = None

    # -- scope helpers ---------------------------------------------------
    @property
    def _current(self) -> Scope:
        return self.scopes[-1]

    def _push(self, name: str) -> None:
        self.scopes.append(Scope(name=name, depth=len(self.scopes)))

    def _pop(self) -> None:
        scope = self.scopes.pop()
        for symbol in scope.symbols:
            if not symbol.used and symbol.type != "":
                self.errors.append(
                    CompilerError(
                        f"Variable '{symbol.name}' is declared but never used",
                        symbol.line,
                        1,
                        "warning",
                        PHASE,
                    )
                )

    def _declare(self, name: str, type: str, line: int) -> None:
        if any(symbol.name == name for symbol in self._current.symbols):
            self._error(f"Variable '{name}' is already declared in this scope", line, 1)
            return
        symbol = Symbol(scope=self._current.name, name=name, type=type, line=line)
        self._current.symbols.append(symbol)
        self.symbols.append(symbol)

    def _lookup(self, name: str) -> Symbol | None:
        for scope in reversed(self.scopes):
            for symbol in scope.symbols:
                if symbol.name == name:
                    return symbol
        return None

    def _error(self, message: str, line: int, column: int = 1) -> None:
        self.errors.append(CompilerError(message, line, column, "error", PHASE))

    # -- entry -----------------------------------------------------------
    def analyze(self, tree: Node | None) -> SemanticResult:
        self._push("global")
        if tree is not None:
            for statement in tree.children:
                self._statement(statement)
        self._pop()
        return SemanticResult(
            symbol_table=self.symbols,
            scopes=self._scopes_snapshot(),
            errors=self.errors,
        )

    def _scopes_snapshot(self) -> list[Scope]:
        # scopes have been popped; return the recorded symbols grouped by scope.
        names: list[Scope] = []
        global_scope = Scope(
            name="global",
            depth=0,
            symbols=[s for s in self.symbols if s.scope == "global"],
        )
        names.append(global_scope)
        for symbol in self.symbols:
            if symbol.scope == "global":
                continue
            existing = next(
                (scope for scope in names if scope.name == symbol.scope), None
            )
            if existing is None:
                names.append(
                    Scope(name=symbol.scope, depth=len(names), symbols=[symbol])
                )
            else:
                existing.symbols.append(symbol)
        return names

    # -- statements ------------------------------------------------------
    def _statement(self, node: Node) -> None:
        handler = getattr(self, f"_stmt_{node.type}", None)
        if handler is not None:
            handler(node)
        else:
            # Unknown statement: traverse defensively.
            for child in node.children:
                self._statement(child)

    def _stmt_Program(self, node: Node) -> None:
        for child in node.children:
            self._statement(child)

    def _stmt_VarDecl(self, node: Node) -> None:
        name_node = node.children[0]
        declared_type = node.value
        init_type = self._expression(node.children[1])
        if init_type is not None and init_type != declared_type:
            self._error(
                f"Cannot assign {init_type} to {declared_type} variable '{name_node.value}'",
                node.line,
                node.column,
            )
        self._declare(name_node.value, declared_type, node.line)

    def _stmt_Assign(self, node: Node) -> None:
        name_node = node.children[0]
        symbol = self._lookup(name_node.value)
        rhs_type = self._expression(node.children[1])
        if symbol is None:
            self._error(
                f"Variable '{name_node.value}' not declared", node.line, node.column
            )
            return
        symbol.used = True
        if rhs_type is not None and rhs_type != symbol.type:
            self._error(
                f"Cannot assign {rhs_type} to {symbol.type} variable '{name_node.value}'",
                node.line,
                node.column,
            )

    def _stmt_Block(self, node: Node) -> None:
        self._push(f"block@{node.line}:{node.column}")
        for child in node.children:
            self._statement(child)
        self._pop()

    def _stmt_If(self, node: Node) -> None:
        condition_type = self._expression(node.children[0])
        if condition_type is not None and condition_type != _BOOL:
            self._error(
                f"If condition must be bool, found {condition_type}",
                node.line,
                node.column,
            )
        for child in node.children[1:]:
            self._statement(child)

    def _stmt_While(self, node: Node) -> None:
        condition_type = self._expression(node.children[0])
        if condition_type is not None and condition_type != _BOOL:
            self._error(
                f"While condition must be bool, found {condition_type}",
                node.line,
                node.column,
            )
        self._statement(node.children[1])

    def _stmt_For(self, node: Node) -> None:
        counter = node.children[0]
        start_type = self._expression(node.children[1])
        end_type = self._expression(node.children[2])
        for bound_type, label in ((start_type, "start"), (end_type, "end")):
            if bound_type is not None and bound_type != _INT:
                self._error(
                    f"For loop {label} bound must be int, found {bound_type}",
                    node.line,
                    node.column,
                )
        self._push(f"for@{node.line}:{node.column}")
        self._declare(counter.value, _INT, counter.line)
        self._statement(node.children[3])
        self._pop()

    def _stmt_FuncDecl(self, node: Node) -> None:
        name_node = node.children[0]
        params_node = node.children[1]
        return_type = node.value
        body = node.children[2]

        params = params_node.children
        param_names = [param.value for param in params]
        if len(set(param_names)) != len(param_names):
            self._error(
                f"Duplicate parameter name in function '{name_node.value}'",
                node.line,
                node.column,
            )
        self.functions[name_node.value] = FunctionInfo(
            name=name_node.value,
            params=param_names,
            param_types=[
                param.children[0].value if param.children else "" for param in params
            ],
            return_type=return_type,
            line=node.line,
        )

        self._push(f"{name_node.value}@{node.line}")
        for param in params:
            param_type = param.children[0].value if param.children else ""
            self._declare(param.value, param_type, param.line)

        previous_return = self.current_return_type
        self.current_return_type = return_type
        self.function_depth += 1
        for statement in body.children:
            self._statement(statement)
        self.function_depth -= 1
        self.current_return_type = previous_return
        self._pop()

    def _stmt_Return(self, node: Node) -> None:
        if self.function_depth == 0:
            self._error("Return outside function", node.line, node.column)
            for child in node.children:
                self._expression(child)
            return
        if not node.children:
            self._error(
                "Return requires a value — ZubaanScript functions must declare a return type",
                node.line,
                node.column,
            )
            return
        value_type = self._expression(node.children[0])
        if value_type is not None and value_type != self.current_return_type:
            self._error(
                f"Return type mismatch: expected {self.current_return_type}, found {value_type}",
                node.line,
                node.column,
            )

    def _stmt_Print(self, node: Node) -> None:
        self._expression(node.children[0])

    def _stmt_ExprStmt(self, node: Node) -> None:
        self._expression(node.children[0])

    # -- expressions -----------------------------------------------------
    def _expression(self, node: Node) -> str | None:
        handler = getattr(self, f"_expr_{node.type}", None)
        if handler is None:
            return None
        return handler(node)

    def _expr_IntLiteral(self, node: Node) -> str:
        return _INT

    def _expr_FloatLiteral(self, node: Node) -> str:
        return "float"

    def _expr_StringLiteral(self, node: Node) -> str:
        return _STRING

    def _expr_BoolLiteral(self, node: Node) -> str:
        return _BOOL

    def _expr_Error(self, node: Node) -> None:
        return None

    def _expr_Identifier(self, node: Node) -> str | None:
        symbol = self._lookup(node.value)
        if symbol is None:
            self._error(f"Variable '{node.value}' not declared", node.line, node.column)
            return None
        symbol.used = True
        return symbol.type

    def _expr_Unary(self, node: Node) -> str | None:
        operand_type = self._expression(node.children[0])
        if node.value == "-":
            if operand_type is not None and operand_type not in _NUMERIC:
                self._error(
                    f"Unary '-' requires a number, found {operand_type}",
                    node.line,
                    node.column,
                )
                return None
            return operand_type
        if node.value == "nahi":
            if operand_type is not None and operand_type != _BOOL:
                self._error(
                    f"'nahi' requires a bool, found {operand_type}",
                    node.line,
                    node.column,
                )
                return None
            return _BOOL
        return None

    def _expr_Or(self, node: Node):
        return self._logical(node)

    def _expr_And(self, node: Node):
        return self._logical(node)

    def _logical(self, node: Node) -> str | None:
        left = self._expression(node.children[0])
        right = self._expression(node.children[1])
        for operand in (left, right):
            if operand is not None and operand != _BOOL:
                self._error(
                    f"Logical operator requires bool operands, found {operand}",
                    node.line,
                    node.column,
                )
                return _BOOL
        return _BOOL

    def _expr_Binary(self, node: Node) -> str | None:
        left = self._expression(node.children[0])
        right = self._expression(node.children[1])
        operator = node.value
        if left is None or right is None:
            return None

        if operator in _ARITHMETIC:
            return self._check_arithmetic(operator, left, right, node)
        if operator in _COMPARISON:
            if left == right and left in _NUMERIC:
                return _BOOL
            self._error(
                f"Operator '{operator}' requires matching numeric operands, found {left} and {right}",
                node.line,
                node.column,
            )
            return _BOOL
        if operator in _EQUALITY:
            if left == right:
                return _BOOL
            self._error(
                f"Operator '{operator}' requires matching operand types, found {left} and {right}",
                node.line,
                node.column,
            )
            return _BOOL
        return None

    def _check_arithmetic(
        self, operator: str, left: str, right: str, node: Node
    ) -> str | None:
        if operator == "+" and left == _STRING and right == _STRING:
            return _STRING
        if left == right and left in _NUMERIC:
            if operator == "%" and left != _INT:
                self._error(
                    f"Operator '%' requires int operands, found {left}",
                    node.line,
                    node.column,
                )
                return None
            self._check_division_by_zero(operator, node)
            return left
        self._error(
            f"Operator '{operator}' requires matching numeric operands, found {left} and {right}",
            node.line,
            node.column,
        )
        return None

    def _check_division_by_zero(self, operator: str, node: Node) -> None:
        if operator not in ("/", "%"):
            return
        divisor = node.children[1]
        if divisor.type in ("IntLiteral", "FloatLiteral") and divisor.value == 0:
            self._error("Division by zero", node.line, node.column)

    def _expr_Call(self, node: Node) -> str | None:
        info = self.functions.get(node.value)
        arg_types = [self._expression(arg) for arg in node.children]
        if info is None:
            self._error(
                f"Function '{node.value}' is not defined", node.line, node.column
            )
            return None
        if len(node.children) != len(info.params):
            self._error(
                f"Function '{node.value}' expects {len(info.params)} argument(s), got {len(node.children)}",
                node.line,
                node.column,
            )
            return info.return_type
        for index, (arg_type, expected) in enumerate(zip(arg_types, info.param_types)):
            if arg_type is not None and arg_type != expected:
                self._error(
                    f"Argument {index + 1} of '{node.value}' expects {expected}, found {arg_type}",
                    node.line,
                    node.column,
                )
        return info.return_type


def analyze(code: str) -> SemanticResult:
    """Type-check ``code``. Parser diagnostics are surfaced as semantic errors."""
    parse_result = parse(code)
    analyzer = _Analyzer()
    result = analyzer.analyze(parse_result.tree)
    result.errors = parse_result.errors + result.errors
    return result
