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
        allow_origins=[str(origin).rstrip("/") for origin in settings.cors_origins],
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

    @app.get("/api/v1/migrate")
    def run_migrations() -> dict[str, str]:
        from app.db.session import engine
        from sqlalchemy import text
        try:
            with engine.begin() as conn:
                conn.execute(text("""
                    CREATE OR REPLACE VIEW attendance_session_summary AS
                    SELECT
                        s.id AS session_id,
                        s.course_id,
                        s.session_date,
                        s.status AS session_status,
                        COUNT(e.student_id) FILTER (WHERE e.is_active = TRUE) AS enrolled_count,
                        COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present')) AS attended_count,
                        COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS late_count,
                        COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS absent_count,
                        CASE
                            WHEN COUNT(e.student_id) FILTER (WHERE e.is_active = TRUE) = 0 THEN 0
                            ELSE ROUND(
                                (
                                    COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present'))::numeric
                                    / COUNT(e.student_id) FILTER (WHERE e.is_active = TRUE)::numeric
                                ) * 100,
                                2
                            )
                        END AS attendance_percent
                    FROM attendance_sessions s
                    JOIN enrollments e ON e.course_id = s.course_id
                    LEFT JOIN attendance_records ar
                        ON ar.session_id = s.id
                        AND ar.student_id = e.student_id
                    GROUP BY s.id, s.course_id, s.session_date, s.status;
                """))

                conn.execute(text("""
                    CREATE OR REPLACE VIEW student_course_attendance_summary AS
                    SELECT
                        e.course_id,
                        e.student_id,
                        COUNT(s.id) FILTER (WHERE s.status = 'closed') AS total_closed_sessions,
                        COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present')) AS attended_sessions,
                        COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS late_sessions,
                        COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS absent_sessions,
                        CASE
                            WHEN COUNT(s.id) FILTER (WHERE s.status = 'closed') = 0 THEN 0
                            ELSE ROUND(
                                (
                                    COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present'))::numeric
                                    / COUNT(s.id) FILTER (WHERE s.status = 'closed')::numeric
                                ) * 100,
                                2
                            )
                        END AS attendance_percent
                    FROM enrollments e
                    JOIN attendance_sessions s ON s.course_id = e.course_id
                    LEFT JOIN attendance_records ar
                        ON ar.session_id = s.id
                        AND ar.student_id = e.student_id
                    WHERE e.is_active = TRUE
                    GROUP BY e.course_id, e.student_id;
                """))
            return {"status": "Database successfully migrated! Views created."}
        except Exception as e:
            return {"error": f"Migration failed: {str(e)}"}

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
