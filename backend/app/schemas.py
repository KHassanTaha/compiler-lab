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
