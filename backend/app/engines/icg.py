"""Intermediate code generator for ZubaanScript.

Lowers the AST into three-address code (TAC) with numbered temporaries
(``t1``, ``t2``, …) and labels (``L1``, ``L2``, …).

This engine is *best-effort* by contract: it always attempts TAC generation,
even when the semantic phase reported errors. In that case the result status
is ``error`` but ``tac`` is still fully populated and ``note`` is set to
``"TAC generated best-effort"``. Semantic warnings alone do not flip status.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.engines.ast_nodes import Node
from app.engines.errors import CompilerError
from app.engines.parser import parse
from app.engines.semantic import analyze

PHASE = "icg"
BEST_EFFORT_NOTE = "TAC generated best-effort"


@dataclass
class ICGResult:
    tac: list[str] = field(default_factory=list)
    temp_count: int = 0
    label_count: int = 0
    errors: list[CompilerError] = field(default_factory=list)
    note: str | None = None
    status: str = "success"

    def to_dict(self) -> dict:
        data = {
            "tac": self.tac,
            "temp_count": self.temp_count,
            "label_count": self.label_count,
            "errors": [error.to_dict() for error in self.errors],
        }
        if self.note is not None:
            data["note"] = self.note
        return data


class _Generator:
    def __init__(self) -> None:
        self.instructions: list[str] = []
        self._temp = 0
        self._label = 0

    def _new_temp(self) -> str:
        self._temp += 1
        return f"t{self._temp}"

    def _new_label(self) -> str:
        self._label += 1
        return f"L{self._label}"

    def _emit(self, instruction: str) -> None:
        self.instructions.append(instruction)

    def _label_here(self) -> None:
        self.instructions.append(f"{self._new_label()}:")

    # -- entry -----------------------------------------------------------
    def generate(self, tree: Node | None) -> None:
        if tree is None:
            return
        for statement in tree.children:
            self._statement(statement)

    def _statement(self, node: Node) -> None:
        handler = getattr(self, f"_stmt_{node.type}", None)
        if handler is not None:
            handler(node)
        else:
            for child in node.children:
                self._statement(child)

    def _stmt_Program(self, node: Node) -> None:
        for child in node.children:
            self._statement(child)

    def _stmt_VarDecl(self, node: Node) -> None:
        name = node.children[0].value
        value = self._expression(node.children[1])
        self._emit(f"{name} = {value}")

    def _stmt_Assign(self, node: Node) -> None:
        name = node.children[0].value
        value = self._expression(node.children[1])
        self._emit(f"{name} = {value}")

    def _stmt_Block(self, node: Node) -> None:
        for child in node.children:
            self._statement(child)

    def _stmt_ExprStmt(self, node: Node) -> None:
        self._expression(node.children[0])

    def _stmt_Print(self, node: Node) -> None:
        value = self._expression(node.children[0])
        self._emit(f"print {value}")

    def _stmt_Return(self, node: Node) -> None:
        if node.children:
            value = self._expression(node.children[0])
            self._emit(f"return {value}")
        else:
            self._emit("return")

    def _stmt_If(self, node: Node) -> None:
        condition = self._expression(node.children[0])
        has_else = len(node.children) > 2
        if has_else:
            else_label = self._new_label()
            self._emit(f"ifFalse {condition} goto {else_label}")
            self._statement(node.children[1])
            end_label = self._new_label()
            self._emit(f"goto {end_label}")
            self._emit(f"{else_label}:")
            self._statement(node.children[2])
            self._emit(f"{end_label}:")
        else:
            end_label = self._new_label()
            self._emit(f"ifFalse {condition} goto {end_label}")
            self._statement(node.children[1])
            self._emit(f"{end_label}:")

    def _stmt_While(self, node: Node) -> None:
        start = self._new_label()
        end = self._new_label()
        self._emit(f"{start}:")
        condition = self._expression(node.children[0])
        self._emit(f"ifFalse {condition} goto {end}")
        self._statement(node.children[1])
        self._emit(f"goto {start}")
        self._emit(f"{end}:")

    def _stmt_For(self, node: Node) -> None:
        counter = node.children[0].value
        start_value = self._expression(node.children[1])
        end_value = self._expression(node.children[2])
        self._emit(f"{counter} = {start_value}")
        start = self._new_label()
        end = self._new_label()
        self._emit(f"{start}:")
        condition_temp = self._new_temp()
        self._emit(f"{condition_temp} = {counter} < {end_value}")
        self._emit(f"ifFalse {condition_temp} goto {end}")
        self._statement(node.children[3])
        self._emit(f"{counter} = {counter} + 1")
        self._emit(f"goto {start}")
        self._emit(f"{end}:")

    def _stmt_FuncDecl(self, node: Node) -> None:
        name = node.children[0].value
        self._emit(f"{name}:")
        self._statement(node.children[2])

    # -- expressions -----------------------------------------------------
    def _expression(self, node: Node) -> str:
        handler = getattr(self, f"_expr_{node.type}", None)
        if handler is not None:
            return handler(node)
        return "_"

    def _expr_IntLiteral(self, node: Node) -> str:
        return str(node.value)

    def _expr_FloatLiteral(self, node: Node) -> str:
        return str(node.value)

    def _expr_StringLiteral(self, node: Node) -> str:
        return f'"{node.value}"'

    def _expr_BoolLiteral(self, node: Node) -> str:
        return "sach" if node.value else "jhoot"

    def _expr_Error(self, node: Node) -> str:
        return "_"

    def _expr_Identifier(self, node: Node) -> str:
        return node.value

    def _expr_Unary(self, node: Node) -> str:
        operand = self._expression(node.children[0])
        temp = self._new_temp()
        self._emit(f"{temp} = {node.value} {operand}")
        return temp

    def _expr_Binary(self, node: Node) -> str:
        left = self._expression(node.children[0])
        right = self._expression(node.children[1])
        temp = self._new_temp()
        self._emit(f"{temp} = {left} {node.value} {right}")
        return temp

    _expr_Or = _expr_Binary
    _expr_And = _expr_Binary

    def _expr_Call(self, node: Node) -> str:
        args = [self._expression(arg) for arg in node.children]
        temp = self._new_temp()
        self._emit(f"{temp} = call {node.value}, {len(args)}")
        for arg in args:
            self._emit(f"param {arg}")
        return temp


def generate(code: str) -> ICGResult:
    """Generate three-address code for ``code``, best-effort on semantic errors.

    The semantic pass supplies the diagnostics and the error/warning severity
    split; TAC is lowered from the parse tree regardless, so a program with
    semantic errors still yields a full listing.
    """
    semantic_result = analyze(code)
    parse_result = parse(code)
    generator = _Generator()
    generator.generate(parse_result.tree)

    has_semantic_error = any(e.severity == "error" for e in semantic_result.errors)
    result = ICGResult(
        tac=generator.instructions,
        temp_count=generator._temp,
        label_count=generator._label,
        errors=semantic_result.errors,
    )
    if has_semantic_error:
        result.status = "error"
        result.note = BEST_EFFORT_NOTE
    return result
