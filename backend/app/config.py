"""Application settings loaded from environment / .env.

Every value maps 1:1 to an entry documented in backend/.env.example, so a
copy of that file is sufficient to run the service locally.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./compiler_lab.db"
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173"
    env: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        """``CORS_ORIGINS`` is a comma-separated string (pin C10)."""
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @property
    def code_max_length(self) -> int:
        """Code submitted to the engines is capped at 10 000 characters (pin B9)."""
        return 10000


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
