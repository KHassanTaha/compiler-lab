"""Shareable run endpoint: any authenticated user may view any run by id."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Run, User
from app.serializers import run_detail

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}")
def get_run(run_id: int, user: CurrentUser, db: DbSession) -> dict:
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
