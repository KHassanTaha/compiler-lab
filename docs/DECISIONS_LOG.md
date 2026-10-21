# DECISIONS LOG — Compiler Lab

**Purpose.** Append-only record of every structural decision made in this project, with its technical rationale. A decision is logged *before* it reaches code. This file is read during viva defence and whenever anyone asks "why is it built like this?"

**Format.** Each entry: context (what question had to be answered), decision (what was chosen), why (technical rationale), alternatives (what else was on the table and why it lost), consequences (what the choice obligates later).

**Status key.** `Accepted` — locked. `Superseded by D-XX` — replaced; the entry stays for history.

---

## Part 1 — Stack and infrastructure

### D-01 — FastAPI as the backend framework
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4

**Context.** The backend must hand-write every route, model, and auth check; the grading surface includes code clarity and testability.
**Decision.** Python 3.11+ with FastAPI.
**Why.** Pydantic request/response validation gives API-boundary 422s (username regex, EmailStr) for free at the contract level; `TestClient` makes the API test suite trivial; async-ready without forcing async code; type-hint-driven doc generation matches the "understand every line" defence requirement.
**Alternatives.** Flask (manual validation, weaker typing), Django (too much framework, batteries we do not need — batteries like the ORM we are required to hand-pick anyway).
**Consequences.** All validation errors use FastAPI's default `{"detail": [...]}` envelope; the frontend toast layer must mirror that shape (PRD §17).

### D-02 — SQLAlchemy 2.x declarative ORM
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4

**Context.** SQLite locally, Neon Postgres in production, same code both places.
**Decision.** SQLAlchemy 2.x with `mapped_column` style.
**Why.** Abstracts the two engines (no driver-specific SQL anywhere); parameterised queries by default; `JSON` column type works on both SQLite and Postgres for `result_json`.
**Alternatives.** Raw SQL (duplicates dialect handling), SQLModel (extra layer, Pydantic coupling we do not need).
**Consequences.** No Alembic in v1 — schema comes from `Base.metadata.create_all` on startup. Any model change must update schemas + tests in the same commit (contract: PRD §7).

### D-03 — SQLite locally, Neon Postgres in production
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4, §19

**Context.** Zero-setup local dev; a persistent free-tier DB for the deployed demo; no card required.
**Decision.** `DATABASE_URL` switches between `sqlite:///./compiler_lab.db` and the Neon connection string.
**Why.** SQLite removes any setup barrier for graders cloning the repo; Neon is free forever with Postgres fidelity so the production path is not a surprise.
**Alternatives.** Postgres locally (setup friction), Turso/other edge DBs (less familiar, no advantage at this scale).
**Consequences.** The schema and queries must stay dialect-neutral; no raw `sqlite_*` or Postgres-only syntax outside comments.

### D-04 — JWT auth with PyJWT, HS256, 24-hour expiry
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.1, §15, pin B13

**Context.** Two roles, stateless sessions, no managed auth allowed.
**Decision.** PyJWT only, HS256, claims `sub` / `role` / `iat` / `exp`, expiry 1440 minutes, secret from `JWT_SECRET` env. No refresh-token flow in v1.
**Why.** PyJWT is the package the spec names; one token in `localStorage` is adequate for a lab tool (accepted risk, PRD §15); refresh tokens add a storage + rotation surface the project does not need.
**Alternatives.** python-jose (heavier, ambiguous spec mention in earlier drafts — pinned to PyJWT in B13), session cookies (poor SPA fit for the Vercel/Render split).
**Consequences.** 401 handling lives once in `lib/api.ts`: clear token, redirect to `/login`, toast. Adding refresh later requires a decision-log entry.

### D-05 — bcrypt via passlib for password hashing
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §7, §15

**Context.** Passwords must never be stored or compared in plaintext.
**Decision.** `passlib[bcrypt]`, default work factor.
**Why.** Battle-tested, matches the spec, integrates with Pydantic models via a helper in `security.py`.
**Alternatives.** argon2 (fine but passlib is the spec choice), hashlib/scrypt by hand (reinventing a security primitive is indefensible).
**Consequences.** `DEVELOPMENT_CREDENTIALS.md` (gitignored) holds the seed-admin password; never a `.env` or committed file.

### D-06 — React 18 + Vite + TypeScript strict for the frontend
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4

**Context.** SPA against a JSON API; graded on UI polish and code clarity.
**Decision.** React 18 (pinned major), Vite, TypeScript with `strict: true`.
**Why.** Vite dev speed; TS strict catches data-shape drift between EngineResult JSON and card rendering — the single biggest type-error surface in this app.
**Alternatives.** Next.js (SSR unnecessary), JS-only (loses the safety the graded code needs).
**Consequences.** No `any` without `unknown` + narrowing; no `@ts-ignore` without justification comment.

### D-07 — TailwindCSS with custom design tokens
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §11

**Context.** Locked palette (cream/beige/peach/gold/brown), light theme only, no pill buttons, restylable from one file.
**Decision.** Tailwind `theme.extend` tokens: `brand.*` and `status.*`. No hex value in any component.
**Why.** The palette *is* the grading surface; centralising it makes the "change one file to restyle" claim true and auditable.
**Alternatives.** CSS modules (harder to enforce token discipline), styled-components (runtime cost, inline-style smell).
**Consequences.** `rounded-full` is forbidden on buttons (badges/avatars only); violation is a review defect.

### D-08 — Framer Motion for animation
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §11

**Context.** Animations required but must stay subtle and respect `prefers-reduced-motion`.
**Decision.** Framer Motion: page transitions 200 ms, card expand 180 ms, badge pop 150 ms, toast spring.
**Why.** Declarative `motion.*` components integrate with reduced-motion checks; CSS-only would need custom media queries duplicated across components.
**Alternatives.** CSS transitions only (split-brain timing discipline), GSAP (overkill).
**Consequences.** No infinite loops (breaks UI automation and accessibility); all durations live near their component.

### D-09 — CodeMirror 6 via @uiw/react-codemirror
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4, pin C5

**Context.** The editor needs line numbers, syntax highlighting for a custom language, auto-indent, and Ctrl/Cmd+Enter.
**Decision.** `@uiw/react-codemirror` + a `StreamLanguage` simple-mode built from the keyword map.
**Why.** CM6 is the spec's choice; `StreamLanguage` lets us derive ZubaanScript highlighting directly from `keywords.py` — one source of truth for keywords and highlighting.
**Alternatives.** Monaco (heavy), Prism (read-only focused), hand-rolled textarea (fails the highlighting requirement).
**Consequences.** When a keyword is added to `keywords.py`, regenerate the stream mode; highlight drift is a defect.

### D-10 — Playwright (Python) for the screenshot suite
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §20.3

**Context.** 23 named screenshots are graded deliverables; selectors must be enforced, not hoped for.
**Decision.** `scripts/capture_screenshots.py` with `playwright.sync_api`, `wait_for_selector` assertions, `[OK]/[FAIL]` per shot, non-zero exit on any failure.
**Why.** One script is the single source of screenshot truth; asserting `data-testid` existence before capture turns screenshots into a UI contract test.
**Alternatives.** Manual screenshots (drift, non-reproducible), JS Playwright (second toolchain for no gain — Python is already present).
**Consequences.** Every PRD §20.4 `data-testid` must exist in React; renaming one without updating the script is a build break (AGENTS §17).

### D-11 — Engine coverage gate at ≥ 85%
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §18.1

**Context.** Tests are a graded criterion; engines are the heart of the project.
**Decision.** `pytest --cov=app.engines --cov-fail-under=85` gates every engine phase and the project as a whole.
**Why.** A number-only gate on *engine* code (not routers) keeps the measurement meaningful: engines are pure functions, so line coverage there genuinely reflects behavioural testing.
**Alternatives.** Overall `app` coverage (diluted by thin route handlers), no gate (defeats the requirement).
**Consequences.** Every engine function must be reachable from tests without FastAPI; engine purity (AGENTS §3.4) is enforced by the gate itself.

### D-12 — Free-tier-only deployment
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §19

**Context.** No paid services anywhere.
**Decision.** Render free web service (backend), Neon free Postgres (DB), Vercel free static (frontend).
**Why.** All three have no-card free tiers; `render.yaml` + `vercel.json` make deployment declarative; cold-start delay (15 min idle) is acceptable for a demo.
**Alternatives.** Railway/Fly (trial limits), a single paid host (violates constraint).
**Consequences.** Build must stay within 512 MB (Render free) — pinned dependency list in §4.1 exists partly for this.

---

## Part 2 — Project identity and architecture contracts

### D-13 — Language name: ZubaanScript
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §1, §5

**Context.** The toy language needs a name for the product identity, the docs page, and the report.
**Decision.** **ZubaanScript** ("zuban" = tongue/language; "script" = a written form — a language for writing programs).
**Why.** Hinglish identity is the project's differentiator; the name reads clearly in both English and Urdu/Hindi contexts and signals "a language specification," which is what the compiler course is about.
**Alternatives.** Earlier draft name "Vyakaran" (grammatically about *grammar* rather than the language itself), plain "ToyLang" (no identity).
**Consequences.** All user-facing copy, examples, and the report use ZubaanScript; the earlier name must not survive anywhere in shipped text.

### D-14 — Three-table schema, no migrations tool in v1
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §7

**Context.** `users`, `runs`, `snippets` only; schema created on startup.
**Decision.** `Base.metadata.create_all` at startup; no Alembic in v1.
**Why.** Greenfield app with no existing deployments to migrate; Alembic adds files and ceremony that do not survive the grading scope.
**Alternatives.** Alembic now (premature), raw DDL (bypasses the ORM abstraction from D-02).
**Consequences.** Model changes are breaking for existing local DBs — documented as "delete the `.db` and restart"; production Neon schema is created on first deploy.

### D-15 — Engine independence contract
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §6.4, §9

**Context.** Each engine must be callable on its own through its own API; API callers never chain.
**Decision.** Each engine exports one top-level function on a raw source string. Internally: parser→lex, semantic→parse, ICG→analyze. Engines never import routers, models, or FastAPI.
**Why.** Independence is a graded product contract; purity also makes the coverage gate (D-11) meaningful and the engines trivially unit-testable.
**Alternatives.** A pipeline object (couples callers), re-lexing per engine in routers (wasteful, duplicates error handling).
**Consequences.** Run-all calls the four public functions independently; latency is four full pipelines — accepted at this code scale.

### D-16 — ICG best-effort on semantic errors
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §9.4, §17

**Context.** Semantic errors are common in student code; ICG output is still pedagogically valuable.
**Decision.** If semantic produced any `severity='error'`, ICG `status='error'` but `data.tac` fully populated with `data.note = "TAC generated best-effort"`. Semantic warnings alone never flip ICG to error.
**Why.** Students learn more from seeing TAC alongside errors than from a "not implemented" wall; the status still honestly reports failure.
**Alternatives.** Refusing to generate TAC (contract violation), always `success` (lies about state).
**Consequences.** A dedicated test asserts status/error + populated TAC together (PRD §18.1); the UI must render an errored card that still shows its TAC listing.

### D-17 — One user action = one log row; durations inside `result_json`
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §7, §16

**Context.** Logging scope was over-broad in earlier drafts (auth events, per-engine rows on run-all, a `duration_ms` column).
**Decision.** Only `engine_run` and `input_saved` actions. Run-all writes exactly one row (`engine='all'`, status = worst of four, error_count = sum). `duration_ms` is measured with `perf_counter` in the route handler and stored only inside each engine's `result_json` object.
**Why.** Matches the graded logging contract exactly; keeps the `runs` table a clean audit of *user actions*, not implementation detail; avoids a schema column that would need migration to change meaning.
**Alternatives.** Row-per-engine on run-all (four rows per click, breaks "one action one row"), `duration_ms` column (over-promises a stable schema).
**Consequences.** The run-all DB test asserts count=1 and `engine='all'`; the run-all response nests four duration values under `result_json`.

---

## Part 3 — Engine approach

### D-18 — Recursive descent parser (not table-driven)
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §9.2

**Context.** The parser is a course deliverable; the grammar is LL(1)-shaped.
**Decision.** One function per non-terminal, hand-written precedence chain for expressions.
**Why.** Recursive descent is what the course teaches and what the defence will ask about; error messages come out human-readable for free ("Expected ';' after statement, found '}'").
**Alternatives.** Parser generators (ANTLR/Lark — hides the algorithm being graded), Pratt parsing (elegant but unfamiliar to examiners).
**Consequences.** Grammar changes require touching both the EBNF reference and the matching parse function.

### D-19 — Panic-mode recovery with sync tokens
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §9.2

**Context.** "Multiple errors per run" is a success criterion.
**Decision.** On error: record, skip tokens until `;`, `}`, or EOF, continue. Guard every loop with a progress check (index must advance).
**Why.** Panic mode is the standard taught recovery; the progress guard makes infinite loops structurally impossible — the pathological-input test then verifies it.
**Alternatives.** Single-error-and-bail (fails the criterion), full-context repair (overkill for LL(1) lab).
**Consequences.** A broken program must yield 3+ errors (tested); recovery quality shows in the parser card's error list.

### D-20 — Multi-scope symbol table as an explicit stack
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §9.3

**Context.** Shadowing, unused-variable warnings, and param isolation are all graded checks.
**Decision.** A stack of scope dicts: `{` pushes (function bodies, blocks), `}` pops; lookup walks the stack top-down; symbols carry `{scope, name, type, line, used}`.
**Why.** The stack *is* the scope model — visible in the UI (`symbol_table` and `scopes` output) exactly as the report diagram describes; walk-order gives shadowing rules for free (A16).
**Alternatives.** Flat table with scope ids (harder to render, same semantics), tree of scopes (more indirection than needed).
**Consequences.** Unused-variable detection runs at global/function pop time (warnings must not flip statuses — D-16 interplay tested).

---

## Part 4 — Language semantics (PRD §5.7 pins)

### D-21 — Integer division truncates toward zero; `%` is int-only
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A3, A4)

**Context.** The spec forbids int↔float coercion but never defined `int / int`.
**Decision.** `int / int → int`, truncation toward zero (7/2 = 3, −7/2 = −3). `%` accepts int operands only.
**Why.** C-family semantics are what compiler courses teach; trunc-toward-zero is a single TAC-level operation; keeping `%` int-only avoids a second numeric modality in the op table.
**Alternatives.** Floor division (Python-style, −7/2 = −4 — surprising to C-taught examiners), forcing float division (breaks the natural `int total = total + i` patterns), allowing `%` on floats (C does, but it is out of pedagogical scope).
**Consequences.** The semantic op table and ICG lowering both treat `/` as type-dependent (int→trunc, float→div); a dedicated test covers negative operands.

### D-22 — String concatenation is in scope via `+`
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A9), owner decision 2026-10-21

**Context.** Original spec never defined string operators; recommendation was to exclude concat.
**Decision.** `string + string → string` (concatenation) is allowed. All other string arithmetic (`- * / %`) and all ordering comparisons on strings remain type errors. `== !=` work on strings (A6).
**Why.** Owner chose concat for `likho()` usability — students expect `"name: " + n`. The restriction to `+` alone keeps the op table small: one overloaded operator, no new TAC form (`t1 = a + b` already represents it).
**Alternatives.** Excluded entirely (chosen recommendation, declined), full string operator set (unbounded type-table growth), a `concat()` builtin (grammar addition, worse UX).
**Consequences.** Semantic type table gets a `(string, string) → string` row for `+`; ICG needs no new instruction; the report's "future work" section lists potential `%`/format extensions.

### D-23 — Strict no-coercion type rules for every operator
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.2, §5.7 (A5–A8)

**Context.** "No implicit coercion" was stated but the operand table was not.
**Decision.** Op table exactly as PRD §5.7: same-type numeric pairs for arithmetic; `< > <= >=` numeric only; `== !=` any same-type pair; logical ops bool-only; unary `-` numeric-only; comparison results always bool.
**Why.** Every row is the smallest rule that catches a real student mistake (`jabtak (i)` vs `jabtak (i <= n)`, `"a" < "b"`) without surprising valid code.
**Alternatives.** Python-style leniency (contradicts the spec's strictness), coercion rules (a whole class of bugs hides behind them).
**Consequences.** The semantic analyzer's `check_binary(expr)` is table-driven from this spec; adding an operator requires a PRD §5.7 row and a test first.

### D-24 — `sach`/`jhoot` lex as BOOL_LIT; comments emitted as COMMENT tokens
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A1, A2), §9.1

**Context.** Token types include both `KEYWORD` and `BOOL_LIT`; the comment token's visibility to the parser was unstated.
**Decision.** Boolean literals lex as `BOOL_LIT` (the keyword table is a spelling map, not a token-type assignment). Comments are emitted as `COMMENT` tokens; the parser skips them when advancing.
**Why.** `BOOL_LIT` is listed in §9.1 for a reason — literals belong to literal types; emitting comments keeps the token stream complete (useful for the lexer card) while parser skipping is one `while` condition.
**Alternatives.** Comments dropped at lex time (loses lexer-card visibility), comments as KEYWORD (wrong class), bools as KEYWORD (they would fail primary-expression dispatch).
**Consequences.** Parser's `advance()` skips `COMMENT`; lexer summary `by_type` includes comment count.

### D-25 — Declare-before-use; no hoisting; no implicit declaration
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A11, A12, A18)

**Context.** Both functions and variables could arguably be usable before their declaration lines.
**Decision.** Linear single-pass semantic: functions and variables must be declared before use in source order; assignment to an undeclared name is an error, never an implicit declaration.
**Why.** Matches the explicit-types philosophy (§5.2); hoisting analysis would require pre-scanning pass over the AST for no pedagogical gain; "undeclared variable" on `y = x + ...` is exactly the reference broken program's intended error (§5.6).
**Alternatives.** Function hoisting (JS-like, surprises students of C/Python), implicit declarations (forbidden by §5.2).
**Consequences.** Example programs must declare before use; the semantic analyzer is a single in-order walk.

### D-26 — Nested function declarations allowed
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A10)

**Context.** The EBNF admits `funcDecl` inside `block`, so nesting is grammatically legal; semantic behaviour was undefined.
**Decision.** Allowed: the function's name binds in the enclosing scope; its body is a child scope; parameters live in that body scope.
**Why.** Fighting the grammar would mean an artificial semantic restriction on a legal parse — more code for less expressiveness; scope-stack semantics (D-20) handle it uniformly.
**Alternatives.** Semantic error on nesting (grammar/spec mismatch), top-level-only enforcement (needs a scope-kind flag for no real gain).
**Consequences.** Recursive/self-referencing works only if declared before use (D-25) — a nested function cannot call itself unless its name is bound first; documented.

### D-27 — Bare `return;` is always an error; missing return is not
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A13, A14), owner decision 2026-10-21

**Context.** Every `kaam` declares `-> TYPE`; the grammar's `returnStmt` still allows a missing expression; path analysis was undefined.
**Decision.** `wapas;` with no expression → semantic error ("Return requires a value…"). Falling off the end of a function without returning → allowed in v1, explicitly a documented limitation.
**Why.** Bare return cannot type-check against a declared non-void type (and there is no void type — D-28 note). Path analysis would need conservative reachability over if/while/for graphs — disproportionate work with false positives on student code for a v1 lab tool.
**Alternatives.** Requiring returns on all paths (heavy, error-prone), allowing bare returns (needs a grammar change to add void — out of scope).
**Consequences.** The report's limitations section states this plainly; a v2 path-analysis check is listed as future work.

### D-28 — No void type in the language
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.4 (TYPE production)

**Context.** Whether `kaam` should support procedures without return values.
**Decision.** Not in v1. `TYPE` is exactly `int | float | string | bool`; every function declares a return type; complement to D-27.
**Why.** The EBNF TYPE production is locked; adding void ripples through return checking, calls-as-expressions, and ICG call lowering for no graded benefit.
**Alternatives.** void type (spec change), `-> unit` spelling (invented syntax).
**Consequences.** Utility functions still return something (e.g. `bool`); future-work section mentions void.

### D-29 — Condition expressions must be bool
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A19)

**Context.** C-style languages accept ints as conditions; ZubaanScript's type system made this undefined.
**Decision.** `agar` condition, `jabtak` condition, and both `har` bounds (A20: int counter, int bounds) — conditions specifically must be `bool`.
**Why.** Catches the classic `jabtak (i)` student error at the semantic stage where the message can teach; aligns with the strict-type identity (D-23).
**Alternatives.** Accept anything (undermines bool), treat int as bool at ICG (hides the error).
**Consequences.** Semantic check on condition nodes; error message points at the exact line:col.

### D-30 — Empty program is valid everywhere
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §5.7 (A21), §18.1

**Context.** `program ::= statement* EOF` admits zero statements; downstream behaviour was unstated.
**Decision.** All four engines return `success` with empty outputs (no tokens except EOF, empty tree, empty TAC).
**Why.** `statement*` means zero; an engine that errors on empty input contradicts its own grammar and fails the PRD test list.
**Alternatives.** "Empty program" error (grammar conflict).
**Consequences.** Fixtures include the empty-string case; run-all on empty code writes a success row with empty outputs.

---

## Part 5 — API pins (PRD §8.8)

### D-31 — Uniform pagination envelope
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B1)

**Context.** Four paginated endpoints; the response shape was undefined.
**Decision.** `{"items", "total", "page", "page_size", "total_pages"}` for history, admin runs, admin users, snippets.
**Why.** One frontend `Table`/`Pagination` component consumes one shape; five ad-hoc shapes would guarantee bugs at the History/Admin boundary (which share `RunsTable` by design).
**Alternatives.** FastAPI's raw `total`-less patterns, per-endpoint shapes.
**Consequences.** Pydantic generic `Page[T]` model; tests assert the envelope keys.

### D-32 — Sort grammar with whitelist validation
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.4, §8.8 (B2)

**Context.** `sort=created_at:desc` format specified; failure mode for bad input was not.
**Decision.** `field:direction` parsed at the boundary; field must be on the endpoint's whitelist or 422.
**Why.** Whitelisting is both validation and SQL-injection defence (column names cannot be parameterised — the whitelist is the parameterisation).
**Alternatives.** Silently defaulting on bad input (hides client bugs), accepting arbitrary fields (unsafe).
**Consequences.** One shared parser helper; admin adds `user_id`/`username` to its whitelist.

### D-33 — UTC everywhere for time
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B3, B8, B11)

**Context.** Date filters, `runs_today`, and serialised timestamps needed a timezone policy.
**Decision.** All storage, filtering, and API output is UTC; ISO 8601 with `Z`; `runs_today` compares UTC dates.
**Why.** One policy cannot drift between Render (UTC) and dev machines (local); "today" in a global demo must mean one thing.
**Alternatives.** Server-local time (breaks on host change), per-user timezone (needs profile data we do not have).
**Consequences.** Frontend formats timestamps as UTC-derived; any date-picker filter must send UTC dates (accepted simplification).

### D-34 — Snippet access failures return 404 uniformly
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B5)

**Context.** Missing snippet vs another user's snippet needed a response code.
**Decision.** Both 404.
**Why.** 403 would confirm the snippet exists — an enumeration leak; the ownership test expects isolation without oracle.
**Alternatives.** 403 for foreign IDs (leaks existence), 404/403 split (teaches nothing, complicates client).
**Consequences.** Shared helper `get_owned_snippet_or_404`; tests cover both cases.

### D-35 — Run-all nests results without per-engine run_id
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B6)

**Context.** Each EngineResult carries `run_id` for individual endpoints; run-all writes one row — what do the four nested results show?
**Decision.** Nested results omit `run_id`; the single id appears once at the top level of the run-all response.
**Why.** Four copies of one id imply four rows (contract violation D-17); omitting the field makes the one-row model self-evident in the payload.
**Alternatives.** Same id repeated four times (misleading), `run_id: null` on nested (noisy).
**Consequences.** Frontend Share button reads top-level `run_id` after Run All; schema type unions the single-engine and run-all response shapes.

### D-36 — Admin stats formulas
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B7, B12)

**Context.** `error_rate` and `last_active` definitions were open.
**Decision.** `error_rate` = percentage of runs with `status='error'` (one decimal, 0.0 when empty); `last_active` = `max(created_at)` over the user's runs, null if none.
**Why.** Both are the intuitive reading; defining them prevents the stats card and the report's numbers diverging.
**Alternatives.** Rate based on `error_count > 0` (same set in practice, slower query), last_active from user table (no such column — no auth-event logging, D-17).
**Consequences.** SQL aggregates in the admin router; report §11 quotes these definitions alongside the numbers.

### D-37 — Code preview truncation in list payloads
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B10)

**Context.** History/Admin tables show a "code preview" column; full programs in every row bloat responses.
**Decision.** `code_preview` = first 120 chars + `…`; full code only on detail endpoints.
**Why.** Tables render ~20 rows × 10 kB codes would be megabytes for nothing; the View action already exists for full payload.
**Alternatives.** Full code everywhere (payload bloat), no preview column (loses the at-a-glance scan value).
**Consequences.** Server-side truncation (one implementation, no duplicated client logic).

### D-38 — 10 000-character limit enforced in both layers
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B9), §17

**Context.** The error matrix specified a frontend toast only.
**Decision.** Frontend toast (instant feedback) **and** backend 422 with field message (authoritative).
**Why.** The client is untrusted; an API that accepts 50 kB code violates the published contract for anyone using the API directly.
**Alternatives.** Frontend-only (untrusted), backend-only (poor UX), no limit (unbounded DB rows).
**Consequences.** Pydantic `max_length=10000` on the code field; frontend mirrors the exact number in its toast.

---

## Part 6 — Frontend and implementation policies (PRD §4.2)

### D-39 — React context + hooks for state; no external state library
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C1)

**Context.** Auth token, user object, toasts, and per-page ephemeral state.
**Decision.** One `AuthProvider` context (token + user + login/logout); everything else local component state.
**Why.** The app's global state is two values; Redux/Zustand would add a store, actions, and indirection the grader must learn to read the code.
**Alternatives.** Zustand (nice API, unnecessary), prop drilling alone (crosses too many levels for auth).
**Consequences.** Context value memoised; no context split unless a real re-render problem appears (then a decision entry).

### D-40 — Native fetch wrapper instead of axios
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C2)

**Context.** Every API call goes through `lib/api.ts`.
**Decision.** A thin wrapper over `fetch`: base URL, JSON headers, Bearer token injection, 401/403/5xx/network error mapping to toast actions.
**Why.** The error taxonomy (PRD §17) is app-specific — axios interceptors would wrap the same logic in a library vocabulary; `fetch` is already in the platform (one less dependency in D-12's memory budget).
**Alternatives.** axios (interceptors are nice but the wrapper is ~60 lines), React Query (caching beyond scope).
**Consequences.** All call-sites use `api.get/post/put/delete`; no raw `fetch` outside `lib/api.ts` (review rule).

### D-41 — Custom toast module
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C3), §11

**Context.** Toasts: stackable, 4 s auto-dismiss, manual close, top-right, spring slide-in.
**Decision.** `lib/toast.ts` with a `useToast` hook and a single `<ToastHost/>`.
**Why.** The spec's exact behaviour is a handful of lines; a library brings its own queueing rules, portal markup, and theming fight (the palette tokens are ours, D-07).
**Alternatives.** react-hot-toast (fast to start, off-brand styling to correct), custom Modal per message (violates "no alert").
**Consequences.** Toast timing/stacking covered by a smoke test; tone consistency enforced by the module's `success/error/info` API.

### D-42 — Password strength via a small heuristic, no zxcvbn
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C4), §12.1

**Context.** Strength meter required; rules are min 8 chars, ≥1 letter, ≥1 digit.
**Decision.** Local heuristic scoring those three classes (and length tiers); no external library.
**Why.** zxcvbn (~400 kB) estimates breach-time strength — information we do not display and users cannot act on beyond the stated rules; the meter's job is to mirror the validator, not to be a security oracle.
**Alternatives.** zxcvbn (weight), no meter (violates §12.1).
**Consequences.** Meter states match the field validator exactly — one shared `passwordRules()` function feeds both.

### D-43 — Screenshots script logs in through the real login form
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C9), §20.3

**Context.** 18 of 23 screenshots need an authenticated session (user or admin).
**Decision.** The Playwright script fills the actual login form for each persona (seeded admin; a test user it registers if absent), then navigates.
**Why.** Exercises the real auth path (form validation, JWT storage, redirect) as a bonus assertion; token-injection shortcuts would let a broken login ship with green screenshots.
**Alternatives.** API-login then cookie injection (bypasses what screenshots are supposed to prove), localStorage seeding (breaks if storage key changes silently).
**Consequences.** Script needs a test-user credential strategy (created via API at script start if missing, documented in the script header); login-form `data-testid` must exist.

### D-44 — ZubaanScript highlighting via CodeMirror StreamLanguage
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C5)

**Context.** No CodeMirror language package exists for ZubaanScript.
**Decision.** A `StreamLanguage` simple-mode definition: keywords from `keywords.py` (Hinglish + type words), strings, numbers, `#` comments, operators.
**Why.** Simple-mode covers line-oriented highlighting (enough for a toy language); generating from the same keyword map keeps editor and lexer honest to each other.
**Alternatives.** LeLang for a similar language (wrong keywords), full Lezer grammar (overkill — the parser already exists server-side).
**Consequences.** A test or comment ties the mode's keyword list to `keywords.py`; drift is reviewable.

### D-45 — Admin runs user filter via server-side query params
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C8)

**Context.** Admin needs a "searchable user dropdown" on the runs table; `/admin/runs` accepts `user_id`/`username`.
**Decision.** The dropdown calls `/admin/users` (paginated, already exists) for its option list, then filters runs by setting `user_id` as a query param on `/admin/runs`.
**Why.** Filters happen server-side (efficient, consistent with pagination); usernames are never shipped wholesale into every runs response.
**Alternatives.** Client-side filtering over all runs (defeats pagination), embedding all users in each runs payload.
**Consequences.** RunsTable receives `filters.user_id`; clearing filters clears it (shared with History's clear-all).

### D-46 — Comma-separated CORS origins env format
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.2 (C10)

**Context.** Dev origin (localhost:5173) plus prod Vercel origin must both be allowed.
**Decision.** `CORS_ORIGINS=http://localhost:5173,https://app.vercel.app`, split server-side at startup.
**Why.** One env var readable on both Render's dashboard and in `.env`; no JSON-in-env parsing.
**Alternatives.** Separate vars per origin (scales awkwardly), `*` (defeats the security requirement).
**Consequences.** Startup logs the parsed origins list (origin strings only — never secrets, D-05/§11).

### D-47 — `bcrypt` pinned below 5.0 for passlib compatibility
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.1, pin C1

**Context.** `passlib[bcrypt]` resolves `bcrypt>=4`; `bcrypt` 5.0 removed the module-level `hashpw` path passlib's backend probes, so `CryptContext(schemes=["bcrypt"]).hash()` raises `ValueError: password cannot be longer than 72 bytes` on any input.
**Decision.** Pin `bcrypt==4.3.0` alongside `passlib[bcrypt]==1.7.4` in `requirements.txt`. Verified: hash + verify round-trip succeeds on the pinned pair.
**Why.** The spec names passlib for hashing; dropping it for raw `bcrypt` would change a locked dependency. A version pin is a smaller, reversible change.
**Alternatives.** Raw `bcrypt` calls (contract change, D-03 amendment needed); `bcrypt==4.0.1` (works but older; 4.3.0 retains the same fix).
**Consequences.** passlib logs a one-line "(trapped) error reading bcrypt version" warning at import — harmless, cosmetic, and silenced in pytest via `filterwarnings`. Remove both pins once passlib supports bcrypt 5.

### D-48 — `pydantic-settings` added to the locked backend list
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.1, §4.2 (C10)

**Context.** `config.py` needs `BaseSettings` and `SettingsConfigDict`; Pydantic ≥ 2 moved these out of `pydantic` into the separate `pydantic-settings` distribution. PRD §4.1 lists `pydantic[email]` but not this package.
**Decision.** Add `pydantic-settings==2.16.1` as a direct pinned dependency.
**Why.** It is the official Pydantic companion for exactly this purpose (env + `.env` loading); hand-rolling env parsing would duplicate it and lose `.env` support.
**Alternatives.** `python-dotenv` + manual `os.environ` parsing (loses typed coercion and validation; `python-dotenv` is already present only as the `.env` reader).
**Consequences.** PRD §4.1 should be read as including `pydantic-settings` under the `pydantic` entry; the README dependency list reflects the shipped file.

---

## Part 9 — Phase 6: CRUD, history, admin

### D-49 — One shared `queries.py` for list endpoints
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.3–8.5, §8.8 (B1–B5)

**Context.** History (`/history`), admin runs (`/admin/runs`), and admin users (`/admin/users`) all need the same envelope, sort whitelist, date bounds, and code preview. Snippets adds its own list. Implementing these four times invites drift — one endpoint enforcing a 120-char preview and another 100, one applying UTC bounds and another local.
**Decision.** Put the envelope, sort parsing, date bounds, substring filter, and preview helper in a single `app/queries.py`; every list endpoint routes through it.
**Why.** The pins in PRD §8.8 are cross-cutting contracts. One implementation means a pin can only be broken in one place, and the tests that exercise it cover every endpoint at once.
**Alternatives.** A helper per router (drift risk), a generic repository class (over-engineered for four call sites and three tables).
**Consequences.** A new list endpoint must import from `queries.py` rather than hand-roll pagination. `paginate` returns SQLAlchemy `Row` tuples, so single-entity callers unwrap with `for (x,) in items`.

### D-50 — Snippet "not found" and "not owned" both return 404
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B5)

**Context.** A snippet id belonging to another user could either return 403 (forbidden) or 404 (not found).
**Decision.** Both cases return 404. `_owned()` fetches by id and rejects whenever the row is missing or `user_id` differs.
**Why.** A 403 confirms the id exists under someone else — that is an existence leak. Sharing one response makes the two indistinguishable to the caller.
**Alternatives.** 403 for foreign rows (leaks existence), filtering the id out of the query (works but hides the intent; an explicit guard documents the rule).
**Consequences.** The ownership tests assert 404 (not 403) for GET/PUT/DELETE by a foreign user; changing this would be a privacy regression, so the tests encode the reason, not just the code.

### D-51 — `paginate` preserves joined row tuples
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.8 (B1), D-49

**Context.** Run lists join `runs` to `users` to carry the username on every summary. The first `paginate` implementation used `db.scalars(...)`, which flattens a `(Run, username)` select into bare `Run` objects and dropped the username.
**Decision.** `paginate` executes with `db.execute(...).all()` and returns `Row` tuples; each caller shapes them. Single-entity callers (snippets, admin users) unwrap the one-element tuple.
**Why.** Preserving the raw rows keeps `paginate` generic across one- and two-entity selects without a second code path.
**Alternatives.** A second `paginate_scalars` helper (duplication), embedding username via a correlated subquery on `Run` (works, but the join is clearer and already indexed).
**Consequences.** A test that seeds runs and asserts `username` on summaries would fail loudly under the old `scalars` path — it caught exactly this bug during phase 6.

### D-52 — Admin `username` filter resolved to a `user_id` first
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.5

**Context.** `/admin/runs` accepts both `user_id` and `username`. A naive `username` filter would need its own join predicate alongside the existing runs↔users join, or a subquery.
**Decision.** Resolve `username` to a `user_id` with one lookup, then feed the existing `user_id` filter path. An unknown username sets `user_id = -1`, yielding an empty page rather than an error.
**Why.** Reuses one filter branch, keeps the query shape identical to the `user_id` case, and the -1 sentinel returns a well-formed empty envelope (matching the UI expectation that an unknown filter is not an error).
**Alternatives.** A second `where(User.username == username)` on the joined query (also fine, but two ways to filter runs by user is exactly the drift D-49 avoids), 404 on unknown username (a list filter should not 404).
**Consequences.** A test asserts an unknown username returns `total == 0`; the frontend can list users and set `user_id` without a special "not found" branch.

### D-53 — Redo is a fresh run attributed to the acting user
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §8.5, §9.3

**Context.** When an admin "redoes" another user's run, the resulting row could logically belong to the original user or to the admin who triggered it.
**Decision.** Redo calls the normal engine endpoint as the admin; the new row's `user_id` is the admin's. No special endpoint, no attribution override.
**Why.** The logging contract (AGENTS §4.4, one action → one row) says a run belongs to whoever performed it. The admin performed the run. This also means redo needs no new backend surface — it is just an authenticated `/engines/*` call.
**Alternatives.** A dedicated `/admin/redo/{id}` endpoint that copies attribution (new surface, new logging path, contradicts "one action = one row" simplicity), attributing to the original user (misrepresents who executed it).
**Consequences.** A test drives the full path — admin fetches a foreign run, re-runs its code, and asserts the new row carries the admin's id and username.

---

## Part 10 — Phase 7: frontend scaffold

### D-54 — Frontend dependencies resolved to the latest secure majors
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §4.1, §15; AGENTS §11.2

**Context.** The first `npm install` of the scaffold reported 15 advisories (2 critical, 6 high, 7 moderate). The critical/high ones are all transitive dev-tooling: `vitest`→`tinypool` (critical, prototype-pollution RCE), `tailwindcss`→`chokidar`→`braces` (high, ReDoS). The runtime-relevant moderate ones: `react-router-dom` open-redirect and `vite`→`esbuild` dev-server request proxy. AGENTS §11.2 forbids committing on a high or critical advisory.
**Decision.** Upgrade to the latest majors that clear every advisory: Vite 8, Vitest 5, Tailwind 4, react-router-dom 7, `@vitejs/plugin-react` 6, eslint 10, jsdom 30. React stays on **18.3** (PRD pins the React major) and TypeScript on **5.9** — neither is implicated in any advisory, and upgrading them would be an unrelated breaking change (AGENTS §3.1). Result: `npm audit` → **0 vulnerabilities**.
**Why.** Every advisory was real, and the owner approved the major-version route. Keeping React 18 honours the PRD pin while still obtaining a clean audit; TS 7 (unreleased-quality) was excluded on stability grounds.
**Alternatives.** Bump react-router only and document the rest (owner rejected), leave all as-is (owner rejected), move to React 19 + TS 7 (violates the PRD React pin and adds unrelated risk).
**Consequences.** Tailwind 4 drops `tailwind.config.js` auto-detection, so the theme moved to CSS `@theme` tokens in `src/index.css` and PostCSS uses `@tailwindcss/postcss` (autoprefixer/postcss-import folded in). Vitest 5's `jsdom` and Vite 8 require Node ≥ 20.19/22.12 (present: 22.23). ESLint 10's `react-hooks` adds `set-state-in-effect`, which forced the auth provider to compute its initial session outside an effect.

### D-55 — Theme tokens live in CSS (`@theme`), not a JS config
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §11; D-54

**Context.** Tailwind 4's intended configuration is CSS-first. The palette, fonts, radius, and warm shadow were originally written in `tailwind.config.js` (`theme.extend`).
**Decision.** Declare every token under a single `@theme { … }` block in `src/index.css`, using the same names (`--color-brand-gold-500`, `--font-display`, `--radius-lg`, `--shadow-warm`). No `tailwind.config.js`.
**Why.** Tailwind 4 no longer auto-detects a JS config; the CSS block is the native mechanism and keeps "one file restyles the app" (AGENTS §15.4) true. Token names matching the v3 config means no component class changes.
**Alternatives.** Keep `tailwind.config.js` and load it via `@config` (supported for back-compat, but it is the legacy path and splits configuration across two systems).
**Consequences.** Custom colours are referenced as e.g. `bg-brand-gold-500` exactly as before. A future Tailwind major will not require a migration tool for the theme.

---

## Part 10 — Phase 8: Auth, Landing, Docs, 404

### D-56 — One class component: the top-level `ErrorBoundary`
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §12, AGENTS §3.2, §12.2

**Context.** AGENTS §3.2 requires functional components with hooks only. A React error boundary, however, can only be implemented with `getDerivedStateFromError` / `componentDidCatch`, which are class-only APIs — there is no hook equivalent.
**Decision.** Allow exactly one class component, `components/layout/ErrorBoundary.tsx`, wrapped around the whole app. Every other component stays functional.
**Why.** The requirement (catch render errors, show a themed page, never a white screen) cannot be met with a functional component. This is the single sanctioned exception.
**Alternatives.** A third-party error-boundary package (an unnecessary dependency for ~40 lines), a window `error` listener (does not catch React render errors).
**Consequences.** The file carries a comment stating why it is a class. It is the sole place `console.error` is used, per AGENTS §12.2. Any future boundary reuses this component rather than adding a second class.

### D-57 — Docs content embedded, not fetched
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §10, §12 (Docs page)

**Context.** The `/docs` page must render the EBNF block, the keyword map, and an API summary. The workspace grammar panel separately fetches the full reference from `GET /api/grammar`.
**Decision.** `/docs` embeds its own abridged copies in `lib/docsContent.ts`; it makes no network call. The workspace panel remains the dynamic consumer of `/api/grammar`.
**Why.** PRD §10 states `/docs` is a static page with no backend dependency — it must render for a logged-out visitor even if the API is down. The two audiences also differ: docs is prose-first and abridged; the workspace panel is the complete machine-readable reference.
**Alternatives.** Fetch `/api/grammar` on `/docs` (breaks the "no dependency" rule and duplicates the workspace panel), generate the docs from the backend at request time (server-side templating we do not have).
**Consequences.** The EBNF in `docsContent.ts` and `backend/app/engines/grammar_reference.py` both derive from PRD §5.4; a grammar change must update both, and the trade-off is noted for the report.

---

## Part 11 — Phase 9: Workspace

### D-58 — Result views are pure; `EngineCard` is configured, not copied
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §15 (Workspace), AGENTS §3.5, §15.6

**Context.** The workspace renders four engines whose `data` payloads are structurally unrelated: the lexer returns a token list + summary, the parser a tree + derivation, semantic a symbol table, and ICG a flat TAC list. AGENTS §15.6 requires that `EngineCard` be driven by a config array rather than four copies of the same markup.
**Decision.** Split rendering into four pure presentational views (`views/LexerView.tsx`, `ParserView.tsx`, `SemanticView.tsx`, `IcgView.tsx`), each taking only its `data` type. `engineConfig.tsx` holds a single `ENGINES` array where each entry pairs an engine key with its URL slug, raw-JSON testid, and a `renderFormatted(result)` closure over the matching view. `EngineCard` renders header/badge/duration/toggle/errors once and calls `renderFormatted`.
**Why.** The card chrome (status badge, duration, raw/formatted toggle, collapse, copy) is identical across engines; only the body differs. A config array keeps that single source of truth and makes the four error lists share one `EngineErrors` component.
**Alternatives.** Four bespoke card components (duplicated chrome — the exact defect §15.6 names), a single card with an inline `switch` on engine key (couples chrome to every payload shape in one file).
**Consequences.** A new engine is one array entry plus one view component. The `EngineSlug` type is introduced so the card's `Run` button calls `api.runEngine` with the exact `"lex" | "parse" | "semantic" | "icg"` union, and the per-engine `data` interfaces (`LexerData`, `ParserData`, `SemanticData`, `IcgData`) live beside `EngineResult` in `lib/types.ts`.

### D-59 — Redo prefill runs after the history fetch, URL stripped in `finally`
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §15 (History redo), §17 (Error matrix)

**Context.** `/workspace?redo={id}` must fetch the referenced run, prefill the editor, then re-run the *same* engine (or Run All when the run's engine is `all`). The first implementation stripped the `redo` query param at the top of the effect. Because stripping the param changes `redoId` to `null`, React immediately re-ran the effect and its cleanup set the in-flight request's `active` flag to `false`, so the guard `if (!active) return` swallowed the result and nothing ran. Verified in-browser: `/api/history/2` returned 200 but no `/engines/*` call followed.
**Decision.** Perform `setSearchParams({}, { replace: true })` inside the request's `.finally()`, so the run is dispatched in `.then()` before the URL is cleared; the guard still prevents state updates from a stale effect after the user navigates away.
**Why.** The redo must fire exactly once, and the URL must end clean (`/workspace`) so a page refresh does not replay the run.
**Alternatives.** A `useRef` "handled" flag (works, but leaves the param in the URL on refresh), keying the effect on a derived boolean (does not fix the cleanup race itself).
**Consequences.** Both redo paths were verified in-browser on 2026-10-21 — run-all (`engine='all'`) populates all four cards, and a single-engine run re-runs only that stage. The early-return for a non-numeric id strips the param immediately with no fetch.

### D-60 — ZubaanScript highlighting via a CodeMirror `StreamLanguage`
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §15 (Editor), AGENTS §15.6

**Context.** The editor must syntax-highlight ZubaanScript (Hinglish keywords, `int`/`float`/`string`/`bool`, `sach`/`jhoot`, `//` and `/* */` comments). CodeMirror ships a Lezer grammar language mode per real language but none for a custom one.
**Decision.** Implement a small `StreamLanguage` tokenizer in `features/workspace/zubaanLanguage.ts` and pair it with a `HighlightStyle` (`zubaanHighlight`) whose colours come from the app's warm token palette. `Editor.tsx` wraps `@uiw/react-codemirror`, wiring the language, the highlight style, `lineWrapping`, and a `Mod-Enter` keymap that calls the Run All handler.
**Why.** A full Lezer grammar is unnecessary for colour-only highlighting and would be a large, hard-to-defend artifact. A stream tokenizer is ~50 readable lines and directly teaches the lexical categories the lexer engine also recognises.
**Alternatives.** Reuse `@codemirror/lang-javascript` (wrong keywords — `int`/`kaam` would not highlight), skip highlighting entirely (fails the PRD requirement).
**Consequences.** `@codemirror/language`, `@codemirror/state`, `@codemirror/view`, and `@lezer/highlight` are used transitively (already present via `@uiw/react-codemirror`); no new top-level dependency was added.

---

## Part 12 — Phase 10: History

### D-61 — One runs-table + one filter model for History and Admin
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §15 (History, Admin), AGENTS §3.5, §15.6

**Context.** The History page and the Admin dashboard present the same runs list with the same filters, sort keys, and pagination contract; the Admin view only adds a User column and a `user_id` filter. AGENTS §15.6 explicitly calls duplicating the runs-table logic between the two a defect and names a shared `RunsTable` with a `mode` prop as the fix.
**Decision.** Two shared modules under `features/history/` (used by Admin in phase 11): `RunsTable.tsx` renders the sortable table and takes a `showUser` prop plus an externally-owned `sort`/`onSortChange`/`onRedo`; `filters.ts` owns the `RunFilters` shape, the option lists, `hasActiveFilters`, and `runsQueryParams` (which drops empty filters so the backend receives no constraint). Each page owns its own fetch state.
**Why.** The filter→query-string mapping and the sort-key whitelist are the parts most likely to drift between the two pages; centralising them means a backend contract change (pins B1–B4) is applied in one place.
**Alternatives.** A generic `DataTable` atom (over-abstraction — only runs tables exist), copy the table into both pages (the named defect).
**Consequences.** Admin passes `showUser` and merges `{ user_id }` via `runsQueryParams`'s `extra` argument. `filters.test.ts` locks the "empty filters are dropped" behaviour.

### D-62 — Loading state derived from a request key, not a synchronous `setState`
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** AGENTS §12.2, eslint `react-hooks/set-state-in-effect`

**Context.** `HistoryPage` refetches whenever the filters, sort, page, or page size change. The first draft set `setLoading(true)` synchronously at the top of the effect, which the `react-hooks/set-state-in-effect` rule rejects (and which causes an extra cascading render).
**Decision.** Keep `data` plus a `loadedKey`; serialise all four fetch inputs into a `requestKey` string and set `loadedKey` only inside the promise callbacks. `loading` is then derived as `loadedKey !== requestKey`.
**Why.** It satisfies the lint rule without an eslint-disable, removes the extra render, and makes "stale data while a new request is in flight" fall out naturally — the table shows skeletons until the response for the current key lands.
**Alternatives.** An eslint-disable comment (hides a real pattern smell), a `useReducer` state machine (more ceremony than the page needs).
**Consequences.** The same pattern was applied to the Workspace's `redo` handling and is the standard for the Admin page in phase 11.

### D-63 — Read-only engine cards via `readOnly` prop
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** PRD §15, phase 11–12

**Context.** The shared run view and admin modal need to display stored engine results without exposing per-engine Run actions. `EngineCard` was built for the interactive workspace.
**Decision.** Add an optional `readOnly` prop to `EngineCard` that hides the Run button while preserving the rest of the chrome (status/duration/tabs/errors). A new `features/runs/RunResultView` normalises `result_json` (via `lib/runResult.ts`) to the engine map in canonical order.
**Why.** Minimal surface area change; avoids duplicating card styling/logic for read-only contexts.
**Alternatives.** A separate `ReadOnlyEngineCard` (duplication), passing a disabled/stub `onRun` (would still render the button unless guarded).
**Consequences.** `RunResultView` opens errored cards by default; `runResult.ts` tolerates missing/extra keys in stored JSON.

### D-64 — Admin uses shared runs-table with `onRowClick` override
**Date:** 2026-10-21 · **Status:** Accepted · **Related:** AGENTS §15.6, PRD §15

**Context.** AGENTS §15.6 requires shared `RunsTable` for history and admin. The admin dashboard must open a row-detail modal on click (PRD), while history navigates to `/runs/:id`.
**Decision.** Add an optional `onRowClick?: (run: RunSummary) => void` to `RunsTable`; when provided it is used for row and View clicks, otherwise navigation to `/runs/:id` is preserved. Admin sets `showUser`, wires row-click to open `RunDetailModal`, and uses the `extra` slot on `RunFilters` for the searchable user dropdown.
**Why.** Keeps a single table implementation (prevents drift) while allowing context-appropriate navigation.
**Alternatives.** Two separate table components (violates the explicit requirement), branching heavily inside the component (we branch only at the click target).
**Consequences.** The modal fetches full `RunDetail` via `adminRun` on open; `SharedRunPage` remains the canonical shareable view.

---

## Maintenance rules

1. New structural choice → new `D-XX` entry **before** the code lands.
2. Entries are append-only; supersession is expressed inside the old entry.
3. Every entry links a PRD section; if PRD and this log disagree, the PRD is corrected in the same session.
4. Nothing in this file may contradict the shipped code — reality wins, then both are updated together.
