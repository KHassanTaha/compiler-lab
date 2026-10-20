"""Shared helpers for list endpoints: pagination, filtering, sorting, and
serialisation.

Keeping these in one place means history and admin runs behave identically
for the filters they share, and the pagination envelope (pin B1) is built
in exactly one spot.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time
from math import ceil

from fastapi import HTTPException
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import Run, User

# Sortable fields per endpoint group (pin B2).
RUN_SORT_FIELDS = {"created_at", "engine", "status", "error_count"}
ADMIN_RUN_SORT_FIELDS = RUN_SORT_FIELDS | {"user_id", "username"}
USER_SORT_FIELDS = {"created_at", "username"}

CODE_PREVIEW_LENGTH = 120


def utc_iso(value: datetime | None) -> str | None:
    """ISO 8601 with a ``Z`` suffix (pin B11); naive datetimes are treated as UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def code_preview(code: str) -> str:
    """First 120 characters, ellipsised when truncated (pin B10)."""
    if len(code) <= CODE_PREVIEW_LENGTH:
        return code
    return code[:CODE_PREVIEW_LENGTH] + "\u2026"


def parse_sort(
    sort: str | None, allowed: set[str], default: str = "created_at:desc"
) -> tuple[str, bool]:
    """Return ``(field, descending)``, raising 422 on anything not whitelisted (pin B2)."""
    if sort is None:
        sort = default
    if ":" not in sort:
        raise _unprocessable(f"Invalid sort '{sort}' — expected field:asc|desc")
    field, _, direction = sort.partition(":")
    if field not in allowed or direction not in ("asc", "desc"):
        raise _unprocessable(f"Invalid sort '{sort}'")
    return field, direction == "desc"


def _unprocessable(message: str) -> HTTPException:
    return HTTPException(status_code=422, detail=message)


def day_bounds(value: str | None, *, end: bool) -> datetime | None:
    """Parse an ISO ``YYYY-MM-DD`` filter into an inclusive UTC datetime (pin B3)."""
    if value is None:
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        raise _unprocessable(f"Invalid date '{value}' — expected YYYY-MM-DD") from None
    moment = time.max if end else time.min
    return datetime.combine(parsed, moment, tzinfo=UTC)


def paginate(db: Session, query: Select, page: int, page_size: int) -> dict:
    """Execute ``query`` with LIMIT/OFFSET and build the envelope (pin B1)."""
    if page < 1:
        raise _unprocessable("page must be >= 1")
    if page_size < 1:
        raise _unprocessable("page_size must be >= 1")

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.execute(query.limit(page_size).offset((page - 1) * page_size)).all()
    return {
        "items": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 0,
    }


def apply_run_filters(
    query: Select,
    *,
    user_id: int | None = None,
    action: str | None = None,
    engine: str | None = None,
    status_value: str | None = None,
    q: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> Select:
    if user_id is not None:
        query = query.where(Run.user_id == user_id)
    if action is not None:
        query = query.where(Run.action == action)
    if engine is not None:
        query = query.where(Run.engine == engine)
    if status_value is not None:
        query = query.where(Run.status == status_value)
    if q:
        query = query.where(Run.code.ilike(f"%{q}%"))
    if date_from is not None:
        query = query.where(Run.created_at >= date_from)
    if date_to is not None:
        query = query.where(Run.created_at <= date_to)
    return query


def order_by(query: Select, field: str, descending: bool) -> Select:
    if field == "username":
        column = User.username
    else:
        column = getattr(Run, field, User.id)
    return query.order_by(column.desc() if descending else column.asc())
