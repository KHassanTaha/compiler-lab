"""Admin router: all runs, user management, and dashboard statistics.

Every route is gated by ``require_admin``. Stats follow the pins exactly:
``error_rate`` is a 0–100 percentage with one decimal (B7) and
``runs_today`` counts runs whose UTC date is today (B8).
"""

from datetime import UTC, datetime, time

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.deps import AdminUser, DbSession
from app.models import Run, User
from app.queries import (
    ADMIN_RUN_SORT_FIELDS,
    USER_SORT_FIELDS,
    apply_run_filters,
    day_bounds,
    order_by,
    paginate,
    parse_sort,
    utc_iso,
)
from app.serializers import run_detail, run_summary

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def stats(admin: AdminUser, db: DbSession) -> dict:
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_runs = db.scalar(select(func.count()).select_from(Run)) or 0
    error_runs = (
        db.scalar(select(func.count()).select_from(Run).where(Run.status == "error"))
        or 0
    )

    today = datetime.now(UTC).date()
    start = datetime.combine(today, time.min, tzinfo=UTC)
    end = datetime.combine(today, time.max, tzinfo=UTC)
    runs_today = (
        db.scalar(
            select(func.count())
            .select_from(Run)
            .where(Run.created_at >= start, Run.created_at <= end)
        )
        or 0
    )

    error_rate = round((error_runs / total_runs) * 100, 1) if total_runs else 0.0
    return {
        "total_users": total_users,
        "total_runs": total_runs,
        "error_rate": error_rate,
        "runs_today": runs_today,
    }


@router.get("/runs")
def list_runs(
    admin: AdminUser,
    db: DbSession,
    user_id: int | None = None,
    username: str | None = None,
    action: str | None = None,
    engine: str | None = None,
    status: str | None = None,
    q: str | None = None,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    page: int = 1,
    page_size: int = 20,
    sort: str | None = None,
) -> dict:
    field, descending = parse_sort(sort, ADMIN_RUN_SORT_FIELDS)
    if username is not None and user_id is None:
        match = db.scalar(select(User).where(User.username == username))
        user_id = match.id if match is not None else -1

    query = apply_run_filters(
        select(Run, User.username).join(User, Run.user_id == User.id),
        user_id=user_id,
        action=action,
        engine=engine,
        status_value=status,
        q=q,
        date_from=day_bounds(from_, end=False),
        date_to=day_bounds(to, end=True),
    )
    query = order_by(query, field, descending)
    result = paginate(db, query, page, page_size)
    result["items"] = [run_summary(run, uname) for run, uname in result["items"]]
    return result


@router.get("/runs/{run_id}")
def get_run(run_id: int, admin: AdminUser, db: DbSession) -> dict:
    row = db.execute(
        select(Run, User.username)
        .join(User, Run.user_id == User.id)
        .where(Run.id == run_id)
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Run not found"
        )
    return run_detail(row[0], row[1])


@router.get("/users")
def list_users(
    admin: AdminUser,
    db: DbSession,
    page: int = 1,
    page_size: int = 20,
    sort: str | None = None,
) -> dict:
    field, descending = parse_sort(sort, USER_SORT_FIELDS)
    column = User.username if field == "username" else User.created_at
    query = select(User).order_by(column.desc() if descending else column.asc())

    result = paginate(db, query, page, page_size)
    items = []
    for (user,) in result["items"]:
        run_count = (
            db.scalar(
                select(func.count()).select_from(Run).where(Run.user_id == user.id)
            )
            or 0
        )
        last_active = db.scalar(
            select(func.max(Run.created_at)).where(Run.user_id == user.id)
        )
        items.append(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "run_count": run_count,
                "last_active": utc_iso(last_active),
                "created_at": utc_iso(user.created_at),
            }
        )
    result["items"] = items
    return result


@router.get("/users/{user_id}")
def get_user(user_id: int, admin: AdminUser, db: DbSession) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    run_count = (
        db.scalar(select(func.count()).select_from(Run).where(Run.user_id == user.id))
        or 0
    )
    last_active = db.scalar(
        select(func.max(Run.created_at)).where(Run.user_id == user.id)
    )
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "run_count": run_count,
        "last_active": utc_iso(last_active),
        "created_at": utc_iso(user.created_at),
    }
