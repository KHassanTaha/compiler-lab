"""Compiler error dataclass shared by all four stages.

Every engine records its own errors with a source position and a severity,
so the API can return a uniform error array regardless of which stage
produced them.
"""

from __future__ import annotations

from dataclasses import dataclass

ERROR = "error"
WARNING = "warning"


@dataclass
class CompilerError:
    message: str
    line: int
    column: int
    severity: str = ERROR
    phase: str = ""

    def to_dict(self) -> dict:
        return {
            "message": self.message,
            "line": self.line,
            "column": self.column,
            "severity": self.severity,
            "phase": self.phase,
        }
