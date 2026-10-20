"""Pydantic request/response schemas.

Phase 2 covers the auth + shared envelope shapes used across routers. Engine
result schemas arrive with the engine router; snippet/history schemas arrive
with their routers.
"""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

USERNAME_PATTERN = r"^[a-zA-Z0-9_]{3,32}$"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime


class RegisterRequest(BaseModel):
    username: str = Field(pattern=USERNAME_PATTERN)
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if (
            len(value) < 8
            or not any(c.isdigit() for c in value)
            or not any(c.isalpha() for c in value)
        ):
            raise ValueError(
                "password must be at least 8 characters with a letter and a digit"
            )
        return value


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if (
            len(value) < 8
            or not any(c.isdigit() for c in value)
            or not any(c.isalpha() for c in value)
        ):
            raise ValueError(
                "password must be at least 8 characters with a letter and a digit"
            )
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class RegisterResponse(BaseModel):
    user: UserPublic


class MessageResponse(BaseModel):
    message: str


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Standard pagination envelope (pin B1)."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class CodeRequest(BaseModel):
    """Body for every engine endpoint."""

    code: str = Field(max_length=10000)


class EngineError(BaseModel):
    message: str
    line: int
    column: int
    severity: str
    phase: str


class EngineResult(BaseModel):
    """Uniform engine response (spec §8.2)."""

    engine: str
    status: str
    duration_ms: float
    error_count: int
    data: dict
    errors: list[EngineError]
    run_id: int | None = None


class RunAllResult(BaseModel):
    """run-all response (pin B6): nested results omit run_id; one top-level run_id."""

    lex: EngineResult
    parse: EngineResult
    semantic: EngineResult
    icg: EngineResult
    run_id: int


class SnippetRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    code: str = Field(max_length=10000)


class SnippetSummary(BaseModel):
    """List item with a truncated code preview (pin B10)."""

    id: int
    name: str
    code_preview: str
    created_at: str
    updated_at: str


class SnippetDetail(BaseModel):
    id: int
    name: str
    code: str
    created_at: str
    updated_at: str


class RunSummary(BaseModel):
    """List item: preview only, no full code (pin B10)."""

    id: int
    user_id: int
    username: str
    action: str
    engine: str | None
    status: str | None
    error_count: int | None
    code_preview: str
    created_at: str


class RunDetail(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    engine: str | None
    status: str | None
    error_count: int | None
    code: str
    result_json: dict | None
    created_at: str


class AdminUserSummary(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    run_count: int
    last_active: str | None
    created_at: str


class AdminStats(BaseModel):
    total_users: int
    total_runs: int
    error_rate: float
    runs_today: int
