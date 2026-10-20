"""AST node dataclasses.

Each node serialises to ``{type, value?, children?, line, column}`` — the
shape the parser API returns in ``data.tree``. Literal nodes carry their
parsed value; every other node carries an ordered list of children.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Node:
    type: str
    line: int
    column: int
    value: object | None = None
    children: list[Node] = field(default_factory=list)

    def add(self, child: Node | None) -> Node:
        if child is not None:
            self.children.append(child)
        return self

    def to_dict(self) -> dict:
        node: dict = {"type": self.type, "line": self.line, "column": self.column}
        if self.value is not None:
            node["value"] = self.value
        if self.children:
            node["children"] = [child.to_dict() for child in self.children]
        return node
