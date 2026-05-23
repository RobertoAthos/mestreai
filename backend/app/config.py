from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Mestre IA"
    environment: str = "development"

    openrouter_api_key: str = "mock-openrouter-api-key"
    openrouter_model: str = "anthropic/claude-3.5-sonnet"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    storage_path: str = "./storage"
    max_pdf_size_mb: int = 25

    mock_ai: bool = True

    # asyncpg URL. For local dev: postgresql+asyncpg://mestreai:mestreai@localhost:5432/mestreai
    # For the cloud, point this at the managed Postgres connection string.
    database_url: str = "postgresql+asyncpg://mestreai:mestreai@localhost:5432/mestreai"
    db_echo: bool = False

    # JWT — change `jwt_secret` to a long random string in any non-dev env.
    jwt_secret: str = "dev-only-change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_access_token_ttl_minutes: int = 60 * 24 * 7  # 7 days
    jwt_guest_token_ttl_minutes: int = 60 * 24 * 3  # 3 days

    # Guests can create at most this many projects before being asked to sign up.
    guest_project_quota: int = 1

    @property
    def storage_dir(self) -> Path:
        path = Path(self.storage_path)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
