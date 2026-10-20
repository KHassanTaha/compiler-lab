"""Engine router: ``/engines/*``, plus examples and grammar.

Each endpoint calls exactly one engine function, times it with
``perf_counter`` (durations live inside ``result_json``, never a DB
column), and writes exactly one ``runs`` row. ``run-all`` calls all four
engines but still writes a single row with ``engine='all'``.
"""

from time import perf_counter

from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.engines.examples import EXAMPLES
from app.engines.grammar_reference import GRAMMAR_REFERENCE
from app.engines.icg import generate
from app.engines.lexer import lex
from app.engines.parser import parse
from app.engines.semantic import analyze
from app.models import Run
from app.schemas import CodeRequest, EngineResult, RunAllResult

router = APIRouter(tags=["engines"])

# Engine name -> (public function, run-table engine label).
_ENGINES = {
    "lexer": (lex, "lexer"),
    "parser": (parse, "parser"),
    "semantic": (analyze, "semantic"),
    "icg": (generate, "icg"),
}

_WORST = {"error": 2, "success": 1}


def _run_engine(engine_key: str, code: str) -> EngineResult:
    """Run one engine and return its serialised result. Emits no database writes."""
    func, label = _ENGINES[engine_key]
    started = perf_counter()
    result = func(code)
    duration_ms = round((perf_counter() - started) * 1000, 2)
    payload = result.to_dict()
    return EngineResult(
        engine=label,
        status=result.status,
        duration_ms=duration_ms,
        error_count=sum(1 for e in result.errors if e.severity == "error"),
        data=payload,
        errors=payload["errors"],
    )


def _log_run(db: DbSession, user_id: int, engine: str, code: str, results: list) -> int:
    worst = max(results, key=lambda r: _WORST[r.status])
    run = Run(
        user_id=user_id,
        action="engine_run",
        engine=engine,
        code=code,
        status=worst.status,
        error_count=sum(result.error_count for result in results),
        result_json={
            result.engine: result.model_dump(exclude={"run_id"}) for result in results
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run.id


@router.post("/engines/lex", response_model=EngineResult)
def run_lex(payload: CodeRequest, user: CurrentUser, db: DbSession) -> EngineResult:
    return _single("lexer", payload.code, user.id, db)


@router.post("/engines/parse", response_model=EngineResult)
def run_parse(payload: CodeRequest, user: CurrentUser, db: DbSession) -> EngineResult:
    return _single("parser", payload.code, user.id, db)


@router.post("/engines/semantic", response_model=EngineResult)
def run_semantic(
    payload: CodeRequest, user: CurrentUser, db: DbSession
) -> EngineResult:
    return _single("semantic", payload.code, user.id, db)


@router.post("/engines/icg", response_model=EngineResult)
def run_icg(payload: CodeRequest, user: CurrentUser, db: DbSession) -> EngineResult:
    return _single("icg", payload.code, user.id, db)


def _single(engine_key: str, code: str, user_id: int, db: DbSession) -> EngineResult:
    engine_result = _run_engine(engine_key, code)
    engine_result.run_id = _log_run(db, user_id, engine_key, code, [engine_result])
    return engine_result


@router.post("/engines/run-all", response_model=RunAllResult)
def run_all(payload: CodeRequest, user: CurrentUser, db: DbSession) -> RunAllResult:
    results = {key: _run_engine(key, payload.code) for key in _ENGINES}
    ordered = [results["lexer"], results["parser"], results["semantic"], results["icg"]]
    run_id = _log_run(db, user.id, "all", payload.code, ordered)
    # Pin B6: nested results omit run_id; only the top-level run_id is set.
    for result in ordered:
        result.run_id = None
    return RunAllResult(
        lex=results["lexer"],
        parse=results["parser"],
        semantic=results["semantic"],
        icg=results["icg"],
        run_id=run_id,
    )


@router.get("/examples")
def list_examples() -> dict:
    return {"items": EXAMPLES}


@router.get("/grammar")
def grammar(user: CurrentUser) -> dict:
    return {"items": GRAMMAR_REFERENCE}
