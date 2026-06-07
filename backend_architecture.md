# QR Attendance Management System Backend Architecture

## 1. System Overview

The backend is a FastAPI service backed by PostgreSQL. It manages organizations, users, courses/classes, attendance sessions, QR code generation, QR scans, attendance records, reports, and audit logs.

Core goals:

- Generate secure, short-lived QR tokens for attendance sessions.
- Prevent duplicate, expired, replayed, and unauthorized attendance submissions.
- Support role-based access control for admins, instructors, students, and optional guardians/staff.
- Provide reliable reports by class, course, student, date range, and session.
- Keep attendance records auditable and tamper-evident.

## 2. Recommended Tech Stack

- API framework: FastAPI
- Database: PostgreSQL 15+
- ORM: SQLAlchemy 2.x
- Migrations: Alembic
- Validation: Pydantic v2
- Auth: JWT access tokens + refresh tokens
- Password hashing: Argon2 or bcrypt
- Background jobs: Celery/RQ/Arq for exports, email, cleanup
- Cache/rate limit: Redis
- QR generation: `qrcode` Python package or frontend-rendered QR from backend token payload
- ASGI server: Uvicorn/Gunicorn
- Object storage: S3-compatible storage for exported reports, optional profile photos

## 3. Project Structure

```text
app/
  main.py
  core/
    config.py
    security.py
    permissions.py
    exceptions.py
    pagination.py
    logging.py
  db/
    session.py
    base.py
    migrations/
  models/
    user.py
    organization.py
    academic.py
    attendance.py
    qr.py
    audit.py
  schemas/
    auth.py
    users.py
    courses.py
    attendance.py
    reports.py
  api/
    deps.py
    v1/
      router.py
      auth.py
      users.py
      organizations.py
      departments.py
      courses.py
      enrollments.py
      sessions.py
      attendance.py
      reports.py
      admin.py
  services/
    auth_service.py
    qr_service.py
    attendance_service.py
    report_service.py
    notification_service.py
    audit_service.py
  repositories/
    users.py
    courses.py
    attendance.py
  workers/
    tasks.py
  tests/
    unit/
    integration/
```

## 4. Main Domain Concepts

Organization:
An institution, school, company, or training center using the system.

User:
A person with login credentials. A user can be an admin, instructor, student, or staff member.

Course:
A subject, module, class, or training group where attendance is tracked.

Enrollment:
The relationship between a student and a course.

Attendance Session:
A specific attendance event for a course, usually tied to a date, start time, end time, room, and instructor.

QR Token:
A short-lived, signed, single-session token shown as a QR code. It identifies an attendance session and can rotate periodically.

Attendance Record:
The final attendance status for a student in a session.

Attendance Scan:
The raw scan attempt. Keeping scan attempts separately helps detect fraud, replay attempts, invalid scans, and duplicate submissions.

## 5. Roles And Permissions

Admin:

- Manage organization settings.
- Manage users, departments, courses, and enrollments.
- View and export all reports.
- Override attendance records with audit trail.

Instructor:

- Create and manage attendance sessions for assigned courses.
- Generate and rotate QR codes.
- View session attendance.
- Manually mark or adjust attendance for assigned courses, if allowed by policy.

Student:

- View enrolled courses.
- Scan QR codes for active sessions.
- View own attendance history.

Staff/Viewer:

- Read-only reporting access, based on organization policy.

## 6. Authentication Flow

1. User logs in with email/username and password.
2. API verifies password hash and active status.
3. API issues short-lived JWT access token and longer-lived refresh token.
4. Refresh tokens are stored server-side using hashed token values.
5. Logout revokes the refresh token.
6. Sensitive operations require active user, verified role, and organization membership.

Recommended JWT claims:

```json
{
  "sub": "user_uuid",
  "org_id": "organization_uuid",
  "role": "instructor",
  "token_type": "access",
  "exp": 1779970000
}
```

## 7. QR Attendance Flow

### Instructor Starts A Session

1. Instructor creates an attendance session for a course.
2. Backend verifies the instructor can manage the course.
3. Backend creates `attendance_sessions` row.
4. Backend creates an active QR token in `qr_tokens`.
5. API returns a QR payload or rendered QR image URL.

### Student Scans QR

1. Student opens scan endpoint with QR token.
2. Backend verifies:
   - User is authenticated.
   - User is enrolled in the course.
   - Session is active.
   - QR token exists, is active, and has not expired.
   - Student has not already been marked present for that session.
   - Optional: scan is within allowed GPS/geofence, Wi-Fi/IP range, or device policy.
3. Backend records raw scan attempt in `attendance_scans`.
4. Backend creates or updates `attendance_records`.
5. API returns final attendance status.

### QR Rotation

For stronger replay protection, a session can rotate QR tokens every 15-60 seconds:

1. Previous token is marked inactive.
2. New token is created with a short expiration.
3. Frontend refreshes the QR display periodically.

## 8. Attendance Rules

Recommended status values:

- `present`
- `late`
- `absent`
- `excused`
- `manual_present`

Suggested rules:

- Mark `present` when scanned before `late_after_minutes`.
- Mark `late` when scanned after late threshold but before session closes.
- Mark `absent` automatically after session closes for enrolled students without records.
- Allow manual overrides only for authorized users.
- Every manual override creates an audit log entry.

## 9. API Surface

Base path: `/api/v1`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /auth/me`

### Users

- `POST /users`
- `GET /users`
- `GET /users/{user_id}`
- `PATCH /users/{user_id}`
- `PATCH /users/{user_id}/activate`
- `PATCH /users/{user_id}/deactivate`

### Courses And Enrollments

- `POST /courses`
- `GET /courses`
- `GET /courses/{course_id}`
- `PATCH /courses/{course_id}`
- `DELETE /courses/{course_id}`
- `POST /courses/{course_id}/instructors/{user_id}`
- `DELETE /courses/{course_id}/instructors/{user_id}`
- `POST /courses/{course_id}/enrollments`
- `GET /courses/{course_id}/enrollments`
- `DELETE /courses/{course_id}/enrollments/{student_id}`

### Attendance Sessions

- `POST /courses/{course_id}/sessions`
- `GET /courses/{course_id}/sessions`
- `GET /sessions/{session_id}`
- `PATCH /sessions/{session_id}`
- `POST /sessions/{session_id}/start`
- `POST /sessions/{session_id}/close`
- `POST /sessions/{session_id}/qr/rotate`
- `GET /sessions/{session_id}/qr/current`

### Attendance

- `POST /attendance/scan`
- `GET /sessions/{session_id}/attendance`
- `PATCH /sessions/{session_id}/attendance/{student_id}`
- `GET /students/{student_id}/attendance`
- `GET /me/attendance`

### Reports

- `GET /reports/attendance-summary`
- `GET /reports/course/{course_id}`
- `GET /reports/student/{student_id}`
- `POST /reports/export`
- `GET /reports/exports/{export_id}`

## 10. Key Service Responsibilities

AuthService:

- Login, refresh, logout, password verification, token generation.

QRService:

- Generate cryptographically random token values.
- Hash token values before storing.
- Validate token against session, expiry, active status, and optional rotation window.

AttendanceService:

- Validate student enrollment.
- Record scan attempts.
- Create or update attendance records.
- Apply late/present rules.
- Prevent duplicate records with database constraints.

ReportService:

- Aggregate attendance percentages.
- Generate CSV/XLSX/PDF exports.
- Handle long-running exports through background jobs.

AuditService:

- Store user, action, entity, old values, new values, IP address, and user agent.

## 11. Security Requirements

- Store only hashed QR token values.
- Use HTTPS in production.
- Use JWT expiration and refresh-token rotation.
- Rate limit login and scan endpoints.
- Enforce RBAC at route and service layers.
- Use database constraints to prevent duplicate attendance.
- Store manual changes in audit logs.
- Never trust course/session IDs from the QR token alone; verify everything against the database.
- Optional anti-fraud controls:
  - GPS radius validation.
  - Device fingerprint checks.
  - IP/Wi-Fi allowlist.
  - QR rotation.
  - Scan anomaly detection.

## 12. PostgreSQL Notes

Recommended extensions:

- `pgcrypto` for UUID generation.
- `citext` for case-insensitive emails.

Recommended migration flow:

```bash
alembic init app/db/migrations
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

The complete SQL schema is in `database_schema.sql`.

