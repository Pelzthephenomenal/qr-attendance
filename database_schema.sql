CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM (
    'admin',
    'instructor',
    'student',
    'staff'
);

CREATE TYPE session_status AS ENUM (
    'draft',
    'scheduled',
    'active',
    'closed',
    'cancelled'
);

CREATE TYPE attendance_status AS ENUM (
    'present',
    'late',
    'absent',
    'excused',
    'manual_present'
);

CREATE TYPE scan_result AS ENUM (
    'accepted',
    'duplicate',
    'expired_token',
    'invalid_token',
    'not_enrolled',
    'session_inactive',
    'outside_location',
    'device_rejected',
    'error'
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    code VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name),
    UNIQUE (organization_id, code)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    email CITEXT NOT NULL,
    username VARCHAR(80),
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    matric_no VARCHAR(80),
    staff_no VARCHAR(80),
    phone VARCHAR(40),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (organization_id, email),
    UNIQUE (organization_id, username),
    UNIQUE (organization_id, matric_no),
    UNIQUE (organization_id, staff_no)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_ip INET,
    user_agent TEXT
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    code VARCHAR(60) NOT NULL,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    academic_year VARCHAR(20),
    term VARCHAR(40),
    level VARCHAR(40),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code, academic_year, term)
);

CREATE TABLE course_instructors (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (course_id, instructor_id)
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dropped_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (course_id, student_id)
);

CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(220),
    status session_status NOT NULL DEFAULT 'draft',
    session_date DATE NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    late_after_minutes INTEGER NOT NULL DEFAULT 15 CHECK (late_after_minutes >= 0),
    qr_rotation_seconds INTEGER NOT NULL DEFAULT 30 CHECK (qr_rotation_seconds BETWEEN 10 AND 3600),
    location_name VARCHAR(180),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    allowed_radius_meters INTEGER CHECK (allowed_radius_meters IS NULL OR allowed_radius_meters >= 0),
    require_location BOOLEAN NOT NULL DEFAULT FALSE,
    require_device_check BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    started_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    nonce VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (expires_at > issued_at)
);

CREATE TABLE student_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint_hash TEXT NOT NULL,
    device_label VARCHAR(120),
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, device_fingerprint_hash)
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    marked_at TIMESTAMPTZ,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scan_id UUID,
    minutes_late INTEGER CHECK (minutes_late IS NULL OR minutes_late >= 0),
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);

CREATE TABLE attendance_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    qr_token_id UUID REFERENCES qr_tokens(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
    result scan_result NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    distance_meters INTEGER,
    device_fingerprint_hash TEXT,
    failure_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE attendance_records
    ADD CONSTRAINT fk_attendance_records_scan
    FOREIGN KEY (scan_id)
    REFERENCES attendance_scans(id)
    ON DELETE SET NULL;

CREATE TABLE attendance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    allow_manual_override BOOLEAN NOT NULL DEFAULT TRUE,
    default_late_after_minutes INTEGER NOT NULL DEFAULT 15 CHECK (default_late_after_minutes >= 0),
    default_qr_rotation_seconds INTEGER NOT NULL DEFAULT 30 CHECK (default_qr_rotation_seconds BETWEEN 10 AND 3600),
    require_location_by_default BOOLEAN NOT NULL DEFAULT FALSE,
    require_device_check_by_default BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_attendance_percent NUMERIC(5, 2) CHECK (
        minimum_attendance_percent IS NULL
        OR minimum_attendance_percent BETWEEN 0 AND 100
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
);

CREATE TABLE report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    report_type VARCHAR(80) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    file_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(120) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_attendance_sessions_updated_at
BEFORE UPDATE ON attendance_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_attendance_records_updated_at
BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_attendance_policies_updated_at
BEFORE UPDATE ON attendance_policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_organization_role ON users (organization_id, role);
CREATE INDEX idx_users_department ON users (department_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

CREATE INDEX idx_courses_organization ON courses (organization_id);
CREATE INDEX idx_courses_department ON courses (department_id);
CREATE INDEX idx_course_instructors_instructor ON course_instructors (instructor_id);
CREATE INDEX idx_enrollments_student ON enrollments (student_id);
CREATE INDEX idx_enrollments_course_active ON enrollments (course_id, is_active);

CREATE INDEX idx_attendance_sessions_course_date ON attendance_sessions (course_id, session_date);
CREATE INDEX idx_attendance_sessions_status ON attendance_sessions (status);
CREATE INDEX idx_attendance_sessions_starts_at ON attendance_sessions (starts_at);

CREATE INDEX idx_qr_tokens_session_active ON qr_tokens (session_id, is_active);
CREATE INDEX idx_qr_tokens_expires_at ON qr_tokens (expires_at);

CREATE INDEX idx_attendance_records_student ON attendance_records (student_id);
CREATE INDEX idx_attendance_records_session_status ON attendance_records (session_id, status);
CREATE INDEX idx_attendance_records_marked_at ON attendance_records (marked_at);

CREATE INDEX idx_attendance_scans_student_time ON attendance_scans (student_id, scanned_at DESC);
CREATE INDEX idx_attendance_scans_session_time ON attendance_scans (session_id, scanned_at DESC);
CREATE INDEX idx_attendance_scans_result ON attendance_scans (result);
CREATE INDEX idx_attendance_scans_metadata_gin ON attendance_scans USING GIN (metadata);

CREATE INDEX idx_audit_logs_org_time ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor_time ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

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
