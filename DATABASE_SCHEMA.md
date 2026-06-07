# QR Attendance System - Database Schema

**Last Updated:** June 2026  
**Database Version:** PostgreSQL 15+  
**Status:** Designed (not yet deployed)

---

## 1. Overview

The database schema for QR Attend is a comprehensive relational model designed to support:
- Multi-tenant organizations
- Role-based access control (admin, lecturer, student, staff)
- Course and enrollment management
- Attendance session tracking
- Secure QR token generation and validation
- Comprehensive attendance record keeping
- Audit trail for compliance

### Database Configuration
- **System:** PostgreSQL 15+
- **Extensions:** pgcrypto (UUID), citext (case-insensitive text)
- **Encoding:** UTF-8
- **Timezone:** UTC (with per-organization override)

---

## 2. Entity-Relationship Model

```
┌─────────────────────┐
│   organizations     │
├─────────────────────┤
│ • id (UUID, PK)     │
│ • name              │
│ • slug (unique)     │
│ • timezone          │
│ • is_active         │
│ • created_at        │
│ • updated_at        │
└──────────┬──────────┘
           │ 1:N
           │
    ┌──────┴──────────────────┬──────────────────┐
    │                         │                  │
    ↓                         ↓                  ↓
┌─────────────┐       ┌──────────────┐   ┌──────────────┐
│ departments │       │    users     │   │   courses    │
├─────────────┤       ├──────────────┤   ├──────────────┤
│ • id        │       │ • id         │   │ • id         │
│ • org_id(FK)│       │ • org_id(FK) │   │ • org_id(FK) │
│ • name      │       │ • dept_id(FK)│   │ • dept_id(FK)│
│ • code      │       │ • email      │   │ • code       │
│             │       │ • role       │   │ • title      │
└─────────────┘       │ • password   │   │ • description
                      │ • is_active  │   │ • academic_yr
                      │ • is_verified│   │ • term
                      │ • last_login │   │ • level
                      └──────┬───────┘   └──────┬───────┘
                             │                  │
                             │ N:M             │ N:M
                             │                  │
              ┌──────────────┐│         ┌───────┴──────────┐
              │              ││         │                  │
              ↓              ↓↓         ↓                  ↓
        ┌──────────────┐  ┌──────────────────────┐  ┌────────────────┐
        │ enrollments  │  │ course_instructors   │  │ refresh_tokens │
        ├──────────────┤  ├──────────────────────┤  ├────────────────┤
        │ • id         │  │ • course_id (FK)     │  │ • id           │
        │ • course_id  │  │ • instructor_id (FK) │  │ • user_id (FK) │
        │ • student_id │  │ • assigned_at        │  │ • token_hash   │
        │ • enrolled_at│  └──────────────────────┘  │ • expires_at   │
        │ • dropped_at │                            │ • revoked_at   │
        │ • is_active  │                            │ • created_at   │
        └──────────────┘                            └────────────────┘

┌─────────────────────────────┐
│ attendance_sessions         │ (1:N to many)
├─────────────────────────────┤
│ • id                        │
│ • course_id (FK)            │
│ • created_by (FK: users)    │
│ • title                     │
│ • status (enum)             │
│ • session_date              │
│ • starts_at                 │
│ • ends_at                   │
│ • late_after_minutes        │
│ • qr_rotation_seconds       │
│ • location_name             │
│ • latitude, longitude       │
│ • allowed_radius_meters     │
│ • require_location          │
│ • require_device_check      │
│ • notes                     │
│ • started_at                │
│ • closed_at                 │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┬──────┬──────┐
    │             │      │      │
    ↓             ↓      ↓      ↓
┌────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐
│ qr_tokens  │ │ attendance_scans    │ │attendance_   │
│            │ │                     │ │ records      │
│ • id       │ │ • id                │ │              │
│ • session  │ │ • session_id        │ │ • id         │
│   _id (FK) │ │ • qr_token_id (FK)  │ │ • session_id │
│ • token_   │ │ • student_id (FK)   │ │ • student_id │
│   hash     │ │ • attendance_record │ │ • status     │
│ • nonce    │ │   _id (FK)          │ │ • marked_at  │
│ • is_      │ │ • result (enum)     │ │ • marked_by  │
│   active   │ │ • scan_ip           │ │ • scan_id    │
│ • issued_at│ │ • scan_device_info  │ │ • minutes_   │
│ • expires_ │ │ • scanned_at        │ │   late       │
│   at       │ │ • created_at        │ │ • is_manual  │
│ • revoked_ │ │                     │ │ • note       │
│   at       │ │                     │ │ • created_at │
│ • created_ │ │                     │ │ • updated_at │
│   by (FK)  │ └─────────────────────┘ └──────────────┘
└────────────┘

┌─────────────────────────┐
│ student_devices         │
├─────────────────────────┤
│ • id                    │
│ • student_id (FK)       │
│ • device_fingerprint    │
│   _hash                 │
│ • device_label          │
│ • is_trusted            │
│ • last_used_at          │
│ • created_at            │
└─────────────────────────┘

┌─────────────────────────┐
│ audit_logs              │
├─────────────────────────┤
│ • id                    │
│ • user_id (FK)          │
│ • action (enum)         │
│ • entity_type           │
│ • entity_id             │
│ • old_values (json)     │
│ • new_values (json)     │
│ • reason_note           │
│ • ip_address            │
│ • user_agent            │
│ • created_at            │
└─────────────────────────┘

┌─────────────────────────┐
│ notifications           │
├─────────────────────────┤
│ • id                    │
│ • recipient_id (FK)     │
│ • sender_id (FK)        │
│ • type (enum)           │
│ • title                 │
│ • content               │
│ • entity_type           │
│ • entity_id             │
│ • is_read               │
│ • read_at               │
│ • created_at            │
└─────────────────────────┘
```

---

## 3. Detailed Table Definitions

### 3.1 organizations

Represents a university, school, or institutional unit using the system.

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,           -- URL-friendly identifier
    timezone VARCHAR(80) NOT NULL DEFAULT 'UTC', -- IANA timezone
    is_active BOOLEAN NOT NULL DEFAULT TRUE,    -- Soft-delete via flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `CREATE INDEX idx_organizations_slug ON organizations(slug);`
- `CREATE INDEX idx_organizations_is_active ON organizations(is_active);`

**Notes:**
- Each organization is isolated (row-level multi-tenancy)
- Timezone allows per-organization scheduling

---

### 3.2 departments

Organizational units within an institution (faculties, schools, departments).

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    code VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name),  -- Name unique within org
    UNIQUE (organization_id, code)   -- Code unique within org
);
```

**Indexes:**
- `CREATE INDEX idx_departments_org_id ON departments(organization_id);`
- `CREATE INDEX idx_departments_code ON departments(code);`

---

### 3.3 users

Represents system users (admin, lecturer, student, staff).

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    email CITEXT NOT NULL,              -- Case-insensitive for lookup
    username VARCHAR(80),                -- Optional, can be null
    password_hash TEXT NOT NULL,         -- Argon2 or bcrypt
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,             -- 'admin', 'lecturer', 'student', 'staff'
    matric_no VARCHAR(80),                -- Student ID (null for non-students)
    staff_no VARCHAR(80),                 -- Staff ID (null for non-staff)
    phone VARCHAR(40),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,           -- For analytics
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,              -- Soft-delete timestamp
    UNIQUE (organization_id, email),
    UNIQUE (organization_id, username),
    UNIQUE (organization_id, matric_no),
    UNIQUE (organization_id, staff_no)
);
```

**User Roles Enum:**
```sql
CREATE TYPE user_role AS ENUM (
    'admin',      -- System administrator
    'instructor', -- Lecturer/instructor
    'student',    -- Student
    'staff'       -- Support staff (read-only)
);
```

**Indexes:**
- `CREATE INDEX idx_users_org_id ON users(organization_id);`
- `CREATE INDEX idx_users_email ON users(email);`
- `CREATE INDEX idx_users_username ON users(username);`
- `CREATE INDEX idx_users_matric_no ON users(matric_no);`
- `CREATE INDEX idx_users_role ON users(role);`
- `CREATE INDEX idx_users_is_active ON users(is_active);`

**Notes:**
- email is CITEXT (case-insensitive) for user lookup
- password_hash never returned in queries, always hashed
- matric_no and staff_no can be null (polymorphic type)
- deleted_at enables soft-delete while maintaining referential integrity

---

### 3.4 refresh_tokens

Stores hashed refresh tokens for stateful token rotation and revocation.

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,    -- Hash of actual token
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,             -- Null = active, not-null = revoked
    replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_ip INET,                 -- IP address of login
    user_agent TEXT                     -- Browser/app info
);
```

**Indexes:**
- `CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);`
- `CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);`

**Notes:**
- Enables token rotation and revocation
- created_by_ip and user_agent for security auditing
- Token rotation chain via replaced_by_token_id

---

### 3.5 courses

Represents academic courses, modules, or classes.

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    code VARCHAR(60) NOT NULL,          -- Course code (e.g., "CS101")
    title VARCHAR(220) NOT NULL,        -- Full course title
    description TEXT,
    academic_year VARCHAR(20),          -- "2025/2026"
    term VARCHAR(40),                   -- "Semester 1", "Term 2", etc
    level VARCHAR(40),                  -- "100 level", "200 level", etc
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code, academic_year, term)
);
```

**Indexes:**
- `CREATE INDEX idx_courses_org_id ON courses(organization_id);`
- `CREATE INDEX idx_courses_dept_id ON courses(department_id);`
- `CREATE INDEX idx_courses_code ON courses(code);`
- `CREATE INDEX idx_courses_academic_year ON courses(academic_year);`

---

### 3.6 course_instructors

Junction table linking instructors to courses (N:M relationship).

```sql
CREATE TABLE course_instructors (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (course_id, instructor_id)
);
```

**Indexes:**
- `CREATE INDEX idx_course_instructors_instructor ON course_instructors(instructor_id);`

**Notes:**
- Multiple instructors can teach one course
- One instructor can teach multiple courses

---

### 3.7 enrollments

Links students to courses (N:M with additional metadata).

```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dropped_at TIMESTAMPTZ,             -- When student dropped course
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (course_id, student_id)
);
```

**Indexes:**
- `CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);`
- `CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);`
- `CREATE INDEX idx_enrollments_is_active ON enrollments(is_active);`

---

### 3.8 attendance_sessions

Represents individual attendance events for a course.

```sql
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(220),                 -- "Lecture 5", "Practical Lab", etc
    status session_status NOT NULL DEFAULT 'draft',
    session_date DATE NOT NULL,         -- Actual date of the session
    starts_at TIMESTAMPTZ NOT NULL,     -- When session begins
    ends_at TIMESTAMPTZ NOT NULL,       -- When session ends
    late_after_minutes INTEGER NOT NULL DEFAULT 15,
    qr_rotation_seconds INTEGER NOT NULL DEFAULT 30,
    location_name VARCHAR(180),         -- Room, building, etc
    latitude NUMERIC(9, 6),             -- For geofencing
    longitude NUMERIC(9, 6),
    allowed_radius_meters INTEGER,      -- Geofence radius
    require_location BOOLEAN NOT NULL DEFAULT FALSE,
    require_device_check BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    started_at TIMESTAMPTZ,             -- When actually started
    closed_at TIMESTAMPTZ,              -- When actually closed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)         -- Ensure end after start
);
```

**Session Status Enum:**
```sql
CREATE TYPE session_status AS ENUM (
    'draft',        -- Being prepared
    'scheduled',    -- Scheduled but not yet active
    'active',       -- Currently accepting scans
    'closed',       -- Finished, no more scans
    'cancelled'     -- Cancelled, ignored
);
```

**Indexes:**
- `CREATE INDEX idx_sessions_course_id ON attendance_sessions(course_id);`
- `CREATE INDEX idx_sessions_status ON attendance_sessions(status);`
- `CREATE INDEX idx_sessions_starts_at ON attendance_sessions(starts_at);`
- `CREATE INDEX idx_sessions_created_by ON attendance_sessions(created_by);`

---

### 3.9 qr_tokens

Short-lived tokens for QR code display during attendance sessions.

```sql
CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,    -- Hash of signed token
    nonce VARCHAR(80) NOT NULL,         -- Unique per token
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,    -- TTL typically 30-60 seconds
    revoked_at TIMESTAMPTZ,             -- Explicit revocation
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (expires_at > issued_at)
);
```

**Indexes:**
- `CREATE INDEX idx_qr_tokens_session_id ON qr_tokens(session_id);`
- `CREATE INDEX idx_qr_tokens_expires_at ON qr_tokens(expires_at);`
- `CREATE INDEX idx_qr_tokens_is_active ON qr_tokens(is_active);`

**Notes:**
- Stored hash never exposes actual token
- nonce prevents replay attacks
- expires_at enables short-lived tokens (30-60 seconds)

---

### 3.10 student_devices

Tracks trusted devices for optional device-based verification.

```sql
CREATE TABLE student_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint_hash TEXT NOT NULL,
    device_label VARCHAR(120),          -- "iPhone 12", "Laptop", etc
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, device_fingerprint_hash)
);
```

**Indexes:**
- `CREATE INDEX idx_student_devices_student_id ON student_devices(student_id);`

---

### 3.11 attendance_scans

Raw scan attempt records for fraud detection and analysis.

```sql
CREATE TABLE attendance_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    qr_token_id UUID REFERENCES qr_tokens(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
    result scan_result NOT NULL,        -- Outcome of scan
    scan_ip INET,                       -- IP address of scan
    scan_device_info TEXT,              -- JSON: user agent, device fingerprint
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Scan Result Enum:**
```sql
CREATE TYPE scan_result AS ENUM (
    'accepted',           -- Successful scan
    'duplicate',          -- Duplicate submission
    'expired_token',      -- Token expired
    'invalid_token',      -- Token invalid or signature mismatch
    'not_enrolled',       -- Student not enrolled
    'session_inactive',   -- Session not active
    'outside_location',   -- Outside geofence
    'device_rejected',    -- Device not trusted
    'error'               -- Generic error
);
```

**Indexes:**
- `CREATE INDEX idx_scans_student_id ON attendance_scans(student_id);`
- `CREATE INDEX idx_scans_session_id ON attendance_scans(session_id);`
- `CREATE INDEX idx_scans_qr_token_id ON attendance_scans(qr_token_id);`
- `CREATE INDEX idx_scans_result ON attendance_scans(result);`

---

### 3.12 attendance_records

Final attendance status for each student in a session.

```sql
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
    UNIQUE (session_id, student_id)    -- One record per student per session
);
```

**Attendance Status Enum:**
```sql
CREATE TYPE attendance_status AS ENUM (
    'present',        -- Marked present
    'late',           -- Marked present but late
    'absent',         -- Marked absent
    'excused',        -- Absent with excuse
    'manual_present'  -- Manually marked by instructor
);
```

**Indexes:**
- `CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);`
- `CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);`
- `CREATE INDEX idx_attendance_records_status ON attendance_records(status);`
- `CREATE INDEX idx_attendance_records_marked_at ON attendance_records(marked_at);`

---

### 3.13 audit_logs

Comprehensive audit trail for compliance and change tracking.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,       -- 'create', 'update', 'delete', 'login', etc
    entity_type VARCHAR(100) NOT NULL,  -- 'User', 'Course', 'AttendanceRecord', etc
    entity_id UUID,
    old_values JSONB,                   -- Previous values (for updates)
    new_values JSONB,                   -- New values (for updates)
    reason_note TEXT,                   -- Why the change was made
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);`
- `CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);`
- `CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);`
- `CREATE INDEX idx_audit_logs_action ON audit_logs(action);`
- `CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);`

**Notes:**
- old_values and new_values stored as JSONB for flexibility
- Immutable: never updated or deleted

---

### 3.14 notifications

System notifications for users.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,         -- 'attendance_reminder', 'low_attendance', etc
    title VARCHAR(220) NOT NULL,
    content TEXT,
    entity_type VARCHAR(100),           -- Related entity type
    entity_id UUID,                     -- Related entity ID
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);`
- `CREATE INDEX idx_notifications_is_read ON notifications(is_read);`
- `CREATE INDEX idx_notifications_created_at ON notifications(created_at);`

---

## 4. Key Constraints & Rules

### Referential Integrity
- All foreign keys use CASCADE or SET NULL based on entity relationship strength
- RESTRICT prevents deletion of entities with dependent records
- Ensures data consistency

### Data Validation
- Email is case-insensitive (CITEXT) within organization
- Timestamps use TIMESTAMPTZ (UTC with offset tracking)
- Enums enforce strict values (no free-text roles, statuses, etc)
- CHECKs enforce business rules (e.g., end_at > start_at)

### Uniqueness Constraints
- Email, username, matric_no, staff_no unique per organization
- Course code unique per organization per academic year per term
- Session-student attendance record unique (prevents double-recording)

### Soft Deletes
- users.deleted_at: Soft-delete flag
- organizations.is_active: Soft-disable
- Uses NULL for active, timestamp for deleted

---

## 5. Indexing Strategy

### Performance Indexes
Primary indexes for common queries:
- `organizations(slug)`: Fast org lookup
- `users(email)`: Fast user login
- `courses(organization_id, code)`: Course lookup
- `enrollments(course_id, student_id)`: Enrollment checks
- `attendance_sessions(course_id, status, starts_at)`: Session queries
- `qr_tokens(session_id, expires_at, is_active)`: Token rotation
- `attendance_records(session_id, student_id, marked_at)`: Attendance queries
- `audit_logs(entity_type, entity_id, created_at)`: Audit trail

### Full-Text Search (Future)
- `CREATE INDEX idx_courses_title_fts ON courses USING GIN(to_tsvector('english', title));`

---

## 6. Query Examples

### User Authentication
```sql
-- Login lookup
SELECT id, password_hash, role, organization_id, is_active
FROM users
WHERE email = $1 AND organization_id = $2;
```

### Enrollment Verification
```sql
-- Check student enrolled in course
SELECT id FROM enrollments
WHERE course_id = $1 AND student_id = $2 AND is_active = true;
```

### Attendance Tracking
```sql
-- Student attendance for course in date range
SELECT ar.status, ar.marked_at, s.title, s.session_date
FROM attendance_records ar
JOIN attendance_sessions s ON ar.session_id = s.id
WHERE ar.student_id = $1 AND s.course_id = $2
  AND s.session_date BETWEEN $3 AND $4
ORDER BY s.session_date DESC;
```

### Attendance Percentage
```sql
-- Calculate attendance percentage for student in course
SELECT 
  COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)::float / 
  COUNT(*)::float * 100 as percentage
FROM attendance_records ar
JOIN attendance_sessions s ON ar.session_id = s.id
WHERE ar.student_id = $1 AND s.course_id = $2 AND ar.is_manual = false;
```

### QR Validation
```sql
-- Check if QR token is valid
SELECT id, session_id, expires_at FROM qr_tokens
WHERE token_hash = crypt($1, token_hash)
  AND is_active = true
  AND expires_at > now()
  AND revoked_at IS NULL
LIMIT 1;
```

---

## 7. Database Maintenance

### Backup Strategy
- Daily automated backups (AWS RDS)
- Point-in-time restore capability
- Monthly backup to cold storage

### Data Retention
- Keep attendance records indefinitely (compliance)
- Archive audit logs older than 7 years
- Clean up expired refresh tokens monthly
- Clean up inactive QR tokens daily

### Monitoring
- Query performance tracking (pg_stat_statements)
- Connection pool monitoring
- Disk usage monitoring
- Replication lag monitoring (if read replicas added)

---

## 8. Migration Strategy

### Alembic Setup (Future)
```bash
alembic init migrations
# Auto-generate migrations as models change
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### Deployment
1. Create migration script
2. Test on staging database
3. Backup production database
4. Run migration with downtime window (if needed)
5. Verify data integrity

---

## 9. Security Considerations

### Access Control
- Database user with minimal permissions (no DROP, TRUNCATE)
- Row-level security policies (RLS) to be implemented
- Parameterized queries to prevent SQL injection

### Audit Logging
- All mutations logged to audit_logs
- Sensitive columns (passwords) never in old_values/new_values
- IP and user-agent tracked for forensics

### Encryption
- Passwords hashed (not reversible)
- Token hashes for security
- Sensitive data at-rest encryption (future)

---

## 10. Performance Metrics & Targets

### Query Performance Targets
- User login: < 50ms
- Session start: < 100ms
- QR scan processing: < 500ms
- Attendance report generation: < 2s
- List queries (pagination): < 200ms

### Database Capacity
- 100,000+ users per organization
- 10,000+ courses per organization
- 1,000,000+ attendance records per semester
- 1,000+ concurrent connections

---

## Related Documentation

- **System Architecture:** `SYSTEM_ARCHITECTURE.md`
- **Project Analysis:** `PROJECT_ANALYSIS.md`
- **Development Roadmap:** `DEVELOPMENT_ROADMAP.md`
- **SQL Schema File:** `database_schema.sql`

