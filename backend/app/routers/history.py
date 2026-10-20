"""History router: the current user's own runs, with filters and pagination."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Run, User
from app.queries import (
    RUN_SORT_FIELDS,
    apply_run_filters,
    day_bounds,
    order_by,
    paginate,
    parse_sort,
)
from app.serializers import run_detail, run_summary

router = APIRouter(prefix="/history", tags=["history"])


def _history_query(user_id: int):
    return (
        select(Run, User.username)
        .join(User, Run.user_id == User.id)
        .where(Run.user_id == user_id)
    )


@router.get("")
def list_history(
    user: CurrentUser,
    db: DbSession,
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
    field, descending = parse_sort(sort, RUN_SORT_FIELDS)
    query = apply_run_filters(
        _history_query(user.id),
        action=action,
        engine=engine,
        status_value=status,
        q=q,
        date_from=day_bounds(from_, end=False),
        date_to=day_bounds(to, end=True),
    )
    query = order_by(query, field, descending)
    result = paginate(db, query, page, page_size)
    result["items"] = [run_summary(run, username) for run, username in result["items"]]
    return result


@router.get("/{run_id}")
def get_history_run(run_id: int, user: CurrentUser, db: DbSession) -> dict:
    row = db.execute(
        select(Run, User.username)
        .join(User, Run.user_id == User.id)
        .where(Run.id == run_id, Run.user_id == user.id)
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Run not found"
        )
    return run_detail(row[0], row[1])
