# Compiler Lab

> A modern, interactive playground for the four stages of compilation.

Compiler Lab is a full-stack web application that lets students and instructors explore the front half of a compiler — **Lexical Analysis → Syntax Analysis → Semantic Analysis → Intermediate Code Generation** — against a custom Hinglish-flavored toy language called **ZubaanScript**. Each engine runs independently through its own API and UI card, or all four at once via **Run All**.

---

## What it does

| Stage | Engine | What you see |
|---|---|---|
| Lexical | `lexer.py` | Token stream with types, line/column, and lexer errors |
| Syntax | `parser.py` | Nested parse-tree JSON, linear derivation, panic-mode error recovery (multiple errors per run) |
| Semantic | `semantic.py` | Multi-scope symbol table, type checking, arity checks, unused-variable warnings |
| ICG | `icg.py` | Three-address code with temporaries (`t1`, `t2`, …) and labels (`L1`, `L2`, …) — best-effort even when semantic errors exist |

The app also includes user auth (JWT), per-user run history with one-click redo, admin oversight of all runs, saved snippets, shareable run links, and pre-loaded example programs (valid and intentionally broken).

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+ / FastAPI / SQLAlchemy 2.x |
| Database | SQLite (local) · Neon Postgres (production, free tier) |
| Auth | JWT (PyJWT) + bcrypt (passlib) |
| Frontend | React 18 + Vite + TypeScript (strict) |
| Styling | TailwindCSS · Framer Motion · Lucide icons |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`) |
| Testing | pytest + pytest-cov (backend) · Vitest + RTL (frontend) |
| Screenshots | Playwright (Python) |
| Deploy | Render (backend) · Vercel (frontend) · Neon (DB) — all free tiers |

## Repository layout

```
compiler-lab/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py             # App factory, CORS, router mounting
│   │   ├── config.py           # Pydantic Settings
│   │   ├── database.py         # Engine + session factory
│   │   ├── models.py           # User, Run, Snippet (SQLAlchemy)
│   │   ├── schemas.py          # Pydantic request/response models
│   │   ├── security.py         # bcrypt + JWT helpers
│   │   ├── deps.py             # get_db, current_user, require_admin
│   │   ├── routers/            # auth, engines, snippets, history, admin, runs, examples, grammar
│   │   └── engines/            # keywords, tokens, errors, ast_nodes, lexer, parser, semantic, icg
│   │                          # examples.py, grammar_reference.py
│   ├── tests/                  # pytest suite (engine coverage gate ≥ 85%)
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/                   # React + Vite + TS
│   └── src/
│       ├── lib/                # api.ts, auth.ts, toast.ts, format.ts
│       ├── components/
│       │   ├── ui/             # Button, Input, Card, Modal, Table, CodeEditor, …
│       │   └── layout/         # Navbar, Footer, ProtectedRoute, AdminRoute
│       ├── pages/              # Landing, Login, Register, Workspace, History, Admin, Docs, SharedRun, 404
│       └── features/           # workspace/, history/, admin/ domain components
├── scripts/                    # capture_screenshots.py
├── render.yaml                 # Render free-tier deploy descriptor
└── README.md
```

## Quick start (local development)

### Prerequisites

- **Python 3.11+** and `pip`
- **Node.js 18+** and `npm`

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit values if needed
uvicorn app.main:app --reload
```

The API is now at **http://localhost:8000**. Health check: `GET http://localhost:8000/health`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env               # edit if backend is not on :8000
npm run dev
```

The app is now at **http://localhost:5173**.

### 3. Seed admin account

Created automatically on first startup if absent:

| Field | Value |
|---|---|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | `Admin@123` |

Change this immediately in any shared environment.

## The ZubaanScript language in 15 seconds

ZubaanScript is a small statically-typed toy language with Hinglish keywords:

```txt
kaam sum(n: int) -> int {
    int total = 0;
    int i = 1;
    jabtak (i <= n) {
        total = total + i;
        i = i + 1;
    }
    wapas total;
}
int n = 10;
int result = sum(n);
likho(result);
```

| English | Hinglish | | English | Hinglish |
|---|---|---|---|---|
| `if` | `agar` | | `true` | `sach` |
| `else` | `warna` | | `false` | `jhoot` |
| `while` | `jabtak` | | `and` | `aur` |
| `for` | `har` | | `or` | `ya` |
| `from` | `se` | | `not` | `nahi` |
| `to` | `tak` | | `def` | `kaam` |
| `return` | `wapas` | | `print` | `likho` |

Types: `int`, `float`, `string`, `bool`. Full EBNF grammar and keyword mapping are available on the in-app **/docs** page.

## API at a glance

Base URL: `http://localhost:8000/api`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Get JWT |
| `POST` | `/engines/lex` | JWT | Run lexer |
| `POST` | `/engines/parse` | JWT | Run parser |
| `POST` | `/engines/semantic` | JWT | Run semantic analyzer |
| `POST` | `/engines/icg` | JWT | Run ICG |
| `POST` | `/engines/run-all` | JWT | Run all four (one log row) |
| `GET` | `/examples` | — | Pre-loaded example programs |
| `GET` | `/grammar` | JWT | Grammar reference entries |
| `GET` | `/history` | JWT | Paginated, filterable run history |
| `GET` | `/runs/{id}` | JWT | View any logged run (shareable) |
| `GET` | `/admin/stats` | Admin | Aggregate stats |

## Testing

```bash
# Backend — engine coverage gate
cd backend
pytest --cov=app.engines --cov-fail-under=85

# Frontend — smoke tests
cd frontend
npm run test
```

## Deployment

| Piece | Target | Config |
|---|---|---|
| Backend | Render (free web service) | `render.yaml` |
| Database | Neon (free Postgres) | `DATABASE_URL` env var on Render |
| Frontend | Vercel (free static) | `frontend/vercel.json` SPA rewrite |

Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGINS` in the Render dashboard. Set `VITE_API_BASE_URL` to the Render URL in Vercel.

## Licence

For academic use. See your institution's policy for submission and plagiarism rules.
