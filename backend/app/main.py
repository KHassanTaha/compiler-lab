"""FastAPI application factory: CORS, table creation, seed admin, health."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import User
from app.routers import auth
from app.security import hash_password

SEED_ADMIN = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin@123",
}


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_admin() -> None:
    """Create the seed admin account when absent (spec: idempotent on startup)."""
    with SessionLocal() as db:
        exists = db.scalar(select(User).where(User.username == SEED_ADMIN["username"]))
        if exists is not None:
            return
        db.add(
            User(
                username=SEED_ADMIN["username"],
                email=SEED_ADMIN["email"],
                password_hash=hash_password(SEED_ADMIN["password"]),
                role="admin",
            )
        )
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    seed_admin()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Compiler Lab API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router, prefix="/api")

    return app


app = create_app()
