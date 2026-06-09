from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import sentry_sdk

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.base import Base
from app.db.session import engine


def create_app() -> FastAPI:
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=1.0,
        )

    app = FastAPI(title=settings.app_name)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def create_tables_for_development() -> None:
        if settings.auto_create_tables:
            try:
                Base.metadata.create_all(bind=engine)
            except Exception as e:
                print(f"Skipping table creation due to error (likely a race condition or existing Enum): {e}")

    @app.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/v1/seed")
    def seed_database() -> dict[str, str]:
        from app.db.seed import seed
        try:
            seed()
            return {"status": "Database successfully seeded! You can now log in."}
        except Exception as e:
            return {"error": f"Seed failed or already seeded: {str(e)}"}

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
