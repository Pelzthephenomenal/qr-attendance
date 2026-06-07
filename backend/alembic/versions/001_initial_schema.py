"""Initial database schema creation

Revision ID: 001_initial_schema
Revises:
Create date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    user_role = postgresql.ENUM("student", "lecturer", "admin", "staff", name="user_role", create_type=False)
    session_status = postgresql.ENUM(
        "draft", "scheduled", "active", "closed", "cancelled", name="session_status", create_type=False
    )
    attendance_status = postgresql.ENUM(
        "present", "late", "absent", "excused", "manual_present", name="attendance_status", create_type=False
    )
    scan_result = postgresql.ENUM(
        "accepted",
        "duplicate",
        "expired_token",
        "invalid_token",
        "not_enrolled",
        "session_inactive",
        "outside_location",
        "device_rejected",
        "error",
        name="scan_result",
        create_type=False,
    )

    user_role.create(op.get_bind(), checkfirst=True)
    session_status.create(op.get_bind(), checkfirst=True)
    attendance_status.create(op.get_bind(), checkfirst=True)
    scan_result.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "organizations",
        uuid_pk(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False, unique=True),
        sa.Column("timezone", sa.String(80), nullable=False, server_default="UTC"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamps(),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"])

    op.create_table(
        "departments",
        uuid_pk(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("code", sa.String(40)),
        *timestamps(),
        sa.UniqueConstraint("organization_id", "name", name="uq_departments_org_name"),
        sa.UniqueConstraint("organization_id", "code", name="uq_departments_org_code"),
    )
    op.create_index("ix_departments_organization_id", "departments", ["organization_id"])

    op.create_table(
        "users",
        uuid_pk(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("username", sa.String(80)),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("matric_no", sa.String(80)),
        sa.Column("staff_no", sa.String(80)),
        sa.Column("phone", sa.String(40)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("organization_id", "email", name="uq_users_org_email"),
        sa.UniqueConstraint("organization_id", "username", name="uq_users_org_username"),
        sa.UniqueConstraint("organization_id", "matric_no", name="uq_users_org_matric_no"),
        sa.UniqueConstraint("organization_id", "staff_no", name="uq_users_org_staff_no"),
    )
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "refresh_tokens",
        uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column(
            "replaced_by_token_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("refresh_tokens.id", ondelete="SET NULL"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by_ip", postgresql.INET()),
        sa.Column("user_agent", sa.String(500)),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])

    op.create_table(
        "courses",
        uuid_pk(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL")),
        sa.Column("code", sa.String(60), nullable=False),
        sa.Column("title", sa.String(220), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("academic_year", sa.String(20)),
        sa.Column("term", sa.String(40)),
        sa.Column("level", sa.String(40)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamps(),
        sa.UniqueConstraint("organization_id", "code", "academic_year", "term", name="uq_courses_org_code_year_term"),
    )
    op.create_index("ix_courses_organization_id", "courses", ["organization_id"])
    op.create_index("ix_courses_code", "courses", ["code"])
    op.create_index("ix_courses_is_active", "courses", ["is_active"])

    op.create_table(
        "course_instructors",
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "instructor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_course_instructors_instructor_id", "course_instructors", ["instructor_id"])

    op.create_table(
        "enrollments",
        uuid_pk(),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("dropped_at", sa.DateTime(timezone=True)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("course_id", "student_id", name="uq_enrollments_course_student"),
    )
    op.create_index("ix_enrollments_course_id", "enrollments", ["course_id"])
    op.create_index("ix_enrollments_student_id", "enrollments", ["student_id"])
    op.create_index("ix_enrollments_is_active", "enrollments", ["is_active"])

    op.create_table(
        "attendance_policies",
        uuid_pk(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("allow_manual_override", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("default_late_after_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("default_qr_rotation_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("require_location_by_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("require_device_check_by_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("minimum_attendance_percent", sa.Numeric(5, 2)),
        *timestamps(),
        sa.UniqueConstraint("organization_id", "name", name="uq_attendance_policies_org_name"),
        sa.CheckConstraint("default_late_after_minutes >= 0", name="ck_attendance_policies_late_after_minutes"),
        sa.CheckConstraint(
            "default_qr_rotation_seconds BETWEEN 10 AND 3600",
            name="ck_attendance_policies_qr_rotation_seconds",
        ),
        sa.CheckConstraint(
            "minimum_attendance_percent IS NULL OR minimum_attendance_percent BETWEEN 0 AND 100",
            name="ck_attendance_policies_minimum_attendance_percent",
        ),
    )
    op.create_index("ix_attendance_policies_organization_id", "attendance_policies", ["organization_id"])

    op.create_table(
        "attendance_sessions",
        uuid_pk(),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(220)),
        sa.Column("status", session_status, nullable=False, server_default="draft"),
        sa.Column("session_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("late_after_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("qr_rotation_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("location_name", sa.String(180)),
        sa.Column("latitude", sa.Numeric(9, 6)),
        sa.Column("longitude", sa.Numeric(9, 6)),
        sa.Column("allowed_radius_meters", sa.Integer()),
        sa.Column("require_location", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("require_device_check", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.String(1000)),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint("ends_at > starts_at", name="ck_attendance_sessions_end_after_start"),
        sa.CheckConstraint("late_after_minutes >= 0", name="ck_attendance_sessions_late_after_minutes"),
        sa.CheckConstraint("qr_rotation_seconds BETWEEN 10 AND 3600", name="ck_attendance_sessions_qr_rotation_seconds"),
        sa.CheckConstraint(
            "allowed_radius_meters IS NULL OR allowed_radius_meters >= 0",
            name="ck_attendance_sessions_allowed_radius_meters",
        ),
    )
    op.create_index("ix_attendance_sessions_course_id", "attendance_sessions", ["course_id"])
    op.create_index("ix_attendance_sessions_status", "attendance_sessions", ["status"])
    op.create_index("ix_attendance_sessions_starts_at", "attendance_sessions", ["starts_at"])

    op.create_table(
        "qr_tokens",
        uuid_pk(),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("nonce", sa.String(80), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.CheckConstraint("expires_at > issued_at", name="ck_qr_tokens_expires_after_issued"),
    )
    op.create_index("ix_qr_tokens_session_id", "qr_tokens", ["session_id"])
    op.create_index("ix_qr_tokens_token_hash", "qr_tokens", ["token_hash"])
    op.create_index("ix_qr_tokens_is_active", "qr_tokens", ["is_active"])
    op.create_index("ix_qr_tokens_expires_at", "qr_tokens", ["expires_at"])

    op.create_table(
        "attendance_records",
        uuid_pk(),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", attendance_status, nullable=False),
        sa.Column("marked_at", sa.DateTime(timezone=True)),
        sa.Column("marked_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("minutes_late", sa.Integer()),
        sa.Column("is_manual", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("note", sa.String(500)),
        *timestamps(),
        sa.UniqueConstraint("session_id", "student_id", name="uq_attendance_records_session_student"),
        sa.CheckConstraint("minutes_late IS NULL OR minutes_late >= 0", name="ck_attendance_records_minutes_late"),
    )
    op.create_index("ix_attendance_records_session_id", "attendance_records", ["session_id"])
    op.create_index("ix_attendance_records_student_id", "attendance_records", ["student_id"])

    op.create_table(
        "attendance_scans",
        uuid_pk(),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attendance_sessions.id", ondelete="SET NULL")),
        sa.Column("qr_token_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("qr_tokens.id", ondelete="SET NULL")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "attendance_record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attendance_records.id", ondelete="SET NULL"),
        ),
        sa.Column("result", scan_result, nullable=False),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ip_address", postgresql.INET()),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("latitude", sa.Numeric(9, 6)),
        sa.Column("longitude", sa.Numeric(9, 6)),
        sa.Column("distance_meters", sa.Integer()),
        sa.Column("device_fingerprint_hash", sa.String(255)),
        sa.Column("failure_reason", sa.String(500)),
        sa.Column("metadata", postgresql.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.CheckConstraint(
            "distance_meters IS NULL OR distance_meters >= 0",
            name="ck_attendance_scans_distance_meters",
        ),
    )
    op.create_index("ix_attendance_scans_session_id", "attendance_scans", ["session_id"])
    op.create_index("ix_attendance_scans_student_id", "attendance_scans", ["student_id"])
    op.create_index("ix_attendance_scans_result", "attendance_scans", ["result"])
    op.create_index("ix_attendance_scans_scanned_at", "attendance_scans", ["scanned_at"])

    op.add_column(
        "attendance_records",
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attendance_scans.id", ondelete="SET NULL")),
    )

    op.create_table(
        "student_devices",
        uuid_pk(),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_fingerprint_hash", sa.String(255), nullable=False),
        sa.Column("device_label", sa.String(120)),
        sa.Column("is_trusted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "device_fingerprint_hash", name="uq_student_devices_student_fingerprint"),
    )
    op.create_index("ix_student_devices_student_id", "student_devices", ["student_id"])
    op.create_index("ix_student_devices_device_fingerprint_hash", "student_devices", ["device_fingerprint_hash"])

    op.create_table(
        "report_exports",
        uuid_pk(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("report_type", sa.String(80), nullable=False),
        sa.Column("filters", postgresql.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("file_url", sa.String(500)),
        sa.Column("error_message", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_report_exports_organization_id", "report_exports", ["organization_id"])

    op.create_table(
        "audit_logs",
        uuid_pk(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(120), nullable=False),
        sa.Column("entity_type", sa.String(120), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("old_values", postgresql.JSON()),
        sa.Column("new_values", postgresql.JSON()),
        sa.Column("ip_address", postgresql.INET()),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # Added course_schedules table
    op.create_table(
        "course_schedules",
        uuid_pk(),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("room", sa.String(100)),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_course_schedules_day_of_week"),
        sa.CheckConstraint("end_time > start_time", name="ck_course_schedules_end_after_start"),
    )
    op.create_index("ix_course_schedules_course_id", "course_schedules", ["course_id"])

    # Added notifications table
    op.create_table(
        "notifications",
        uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default="info"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    # Added SQL summary views
    op.execute("""
        CREATE VIEW attendance_session_summary AS
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
    """)

    op.execute("""
        CREATE VIEW student_course_attendance_summary AS
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
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS student_course_attendance_summary")
    op.execute("DROP VIEW IF EXISTS attendance_session_summary")
    op.drop_table("notifications")
    op.drop_table("course_schedules")

    op.drop_table("audit_logs")
    op.drop_table("report_exports")
    op.drop_table("student_devices")
    op.drop_column("attendance_records", "scan_id")
    op.drop_table("attendance_scans")
    op.drop_table("attendance_records")
    op.drop_table("qr_tokens")
    op.drop_table("attendance_sessions")
    op.drop_table("attendance_policies")
    op.drop_table("enrollments")
    op.drop_table("course_instructors")
    op.drop_table("courses")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_table("departments")
    op.drop_table("organizations")

    postgresql.ENUM(name="scan_result").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="attendance_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="session_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="user_role").drop(op.get_bind(), checkfirst=True)

