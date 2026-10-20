"""Run serialisation shared by history, admin, and the shareable-run endpoint.

A summary carries only ``code_preview``; the detail form carries the full
``code`` and ``result_json`` (pin B10).
"""

from app.models import Run, User
from app.queries import code_preview, utc_iso


def run_summary(run: Run, username: str) -> dict:
    return {
        "id": run.id,
        "user_id": run.user_id,
        "username": username,
        "action": run.action,
        "engine": run.engine,
        "status": run.status,
        "error_count": run.error_count,
        "code_preview": code_preview(run.code),
        "created_at": utc_iso(run.created_at),
    }


def run_detail(run: Run, username: str) -> dict:
    return {
        "id": run.id,
        "user_id": run.user_id,
        "username": username,
        "action": run.action,
        "engine": run.engine,
        "status": run.status,
        "error_count": run.error_count,
        "code": run.code,
        "result_json": run.result_json,
        "created_at": utc_iso(run.created_at),
    }


def username_of(db, user_id: int) -> str:
    user = db.get(User, user_id)
    return user.username if user is not None else "unknown"
