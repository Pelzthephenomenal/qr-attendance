import pytest
import sqlite3
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Register UUID adapter for SQLite
sqlite3.register_adapter(uuid.UUID, str)

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import hash_password
from app.models.user import User
from app.models.organization import Organization
from app.models.enums import UserRole

@compiles(INET, 'sqlite')
def compile_inet(type_, compiler, **kw):
    return "VARCHAR"

@compiles(JSONB, 'sqlite')
def compile_jsonb(type_, compiler, **kw):
    return "JSON"

from sqlalchemy.pool import StaticPool

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    # Create tables
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE VIEW IF NOT EXISTS attendance_session_summary AS
            SELECT
                s.id AS session_id,
                s.course_id,
                s.session_date,
                s.status AS session_status,
                COUNT(e.student_id) FILTER (WHERE e.is_active = 1) AS enrolled_count,
                COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present')) AS attended_count,
                COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS late_count,
                COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS absent_count,
                CASE
                    WHEN COUNT(e.student_id) FILTER (WHERE e.is_active = 1) = 0 THEN 0
                    ELSE ROUND(
                        (
                            CAST(COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present')) AS REAL)
                            / CAST(COUNT(e.student_id) FILTER (WHERE e.is_active = 1) AS REAL)
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
            CREATE VIEW IF NOT EXISTS student_course_attendance_summary AS
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
                            CAST(COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late', 'manual_present')) AS REAL)
                            / CAST(COUNT(s.id) FILTER (WHERE s.status = 'closed') AS REAL)
                        ) * 100,
                        2
                    )
                END AS attendance_percent
            FROM enrollments e
            JOIN attendance_sessions s ON s.course_id = e.course_id
            LEFT JOIN attendance_records ar
                ON ar.session_id = s.id
                AND ar.student_id = e.student_id
            WHERE e.is_active = 1
            GROUP BY e.course_id, e.student_id;
        """))
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop tables after each test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
    yield TestClient(app)
    del app.dependency_overrides[get_db]


@pytest.fixture(scope="function")
def test_organization(db_session):
    org = Organization(name="Test Org", slug="test-org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture(scope="function")
def test_user(db_session, test_organization):
    user = User(
        email="test@example.com",
        password_hash=hash_password("testpassword"),
        first_name="Test",
        last_name="User",
        role=UserRole.student,
        matric_no="TESTMATRIC01",
        organization_id=test_organization.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(db_session, test_organization):
    user = User(
        email="admin@example.com",
        password_hash=hash_password("adminpassword"),
        first_name="Admin",
        last_name="User",
        role=UserRole.admin,
        staff_no="ADMIN01",
        organization_id=test_organization.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def admin_token(client, test_admin):
    response = client.post("/api/v1/auth/login", json={"email": test_admin.email, "password": "adminpassword"})
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def test_lecturer(db_session, test_organization):
    user = User(
        email="instructor@example.com",
        password_hash=hash_password("instpassword"),
        first_name="Instructor",
        last_name="User",
        role=UserRole.lecturer,
        staff_no="INST01",
        organization_id=test_organization.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def lecturer_token(client, test_lecturer):
    response = client.post("/api/v1/auth/login", json={"email": test_lecturer.email, "password": "instpassword"})
    return response.json()["access_token"]

