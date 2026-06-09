from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "QR Attend API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/qr_attend"
    jwt_secret_key: str = Field(default="change-this-secret-before-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080  # 7 days
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 300  # 5 minutes
    auto_create_tables: bool = True
    sentry_dsn: str | None = None
    cors_origins: str | list[AnyHttpUrl | str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()

