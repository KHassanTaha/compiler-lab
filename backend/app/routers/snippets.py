"""Snippet router: per-user saved programs.

Ownership is enforced on every read and write: a snippet that does not
exist or belongs to another user returns 404, so existence is never leaked
(pin B5). POST and PUT each log exactly one ``input_saved`` run.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Run, Snippet
from app.queries import code_preview, paginate, utc_iso
from app.schemas import SnippetDetail, SnippetRequest, SnippetSummary

router = APIRouter(prefix="/snippets", tags=["snippets"])


def _owned(db: DbSession, snippet_id: int, user_id: int) -> Snippet:
    snippet = db.get(Snippet, snippet_id)
    if snippet is None or snippet.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )
    return snippet


def _summary(snippet: Snippet) -> SnippetSummary:
    return SnippetSummary(
        id=snippet.id,
        name=snippet.name,
        code_preview=code_preview(snippet.code),
        created_at=utc_iso(snippet.created_at),
        updated_at=utc_iso(snippet.updated_at),
    )


def _detail(snippet: Snippet) -> SnippetDetail:
    return SnippetDetail(
        id=snippet.id,
        name=snippet.name,
        code=snippet.code,
        created_at=utc_iso(snippet.created_at),
        updated_at=utc_iso(snippet.updated_at),
    )


def _log_input_saved(db: DbSession, user_id: int, code: str) -> None:
    db.add(Run(user_id=user_id, action="input_saved", code=code))


@router.get("")
def list_snippets(user: CurrentUser, db: DbSession) -> dict:
    query = (
        select(Snippet)
        .where(Snippet.user_id == user.id)
        .order_by(Snippet.updated_at.desc())
    )
    page = paginate(db, query, page=1, page_size=1000)
    return {
        "items": [_summary(s) for (s,) in page["items"]],
        "total": page["total"],
        "page": page["page"],
        "page_size": page["page_size"],
        "total_pages": page["total_pages"],
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SnippetDetail)
def create_snippet(
    payload: SnippetRequest, user: CurrentUser, db: DbSession
) -> SnippetDetail:
    snippet = Snippet(user_id=user.id, name=payload.name, code=payload.code)
    db.add(snippet)
    _log_input_saved(db, user.id, payload.code)
    db.commit()
    db.refresh(snippet)
    return _detail(snippet)


@router.get("/{snippet_id}", response_model=SnippetDetail)
def get_snippet(snippet_id: int, user: CurrentUser, db: DbSession) -> SnippetDetail:
    return _detail(_owned(db, snippet_id, user.id))


@router.put("/{snippet_id}", response_model=SnippetDetail)
def update_snippet(
    snippet_id: int, payload: SnippetRequest, user: CurrentUser, db: DbSession
) -> SnippetDetail:
    snippet = _owned(db, snippet_id, user.id)
    snippet.name = payload.name
    snippet.code = payload.code
    _log_input_saved(db, user.id, payload.code)
    db.commit()
    db.refresh(snippet)
    return _detail(snippet)


@router.delete("/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_snippet(snippet_id: int, user: CurrentUser, db: DbSession) -> None:
    snippet = _owned(db, snippet_id, user.id)
    db.delete(snippet)
    db.commit()
