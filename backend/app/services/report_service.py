"""
Report export service.

Generates CSV reports for attendance data. Supports two roles:
- admin: access to all sessions across the entire organization
- lecturer: access only to sessions for courses they teach

The CSV is streamed back as a generator to avoid loading everything
into memory for large exports.
"""
import csv
import io
from datetime import datetime, timezone
from typing import Generator, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.attendance_record import AttendanceRecord
from app.models.attendance_session import AttendanceSession
from app.models.course import Course, CourseInstructor
from app.models.enums import UserRole
from app.models.user import User


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_attendance_csv(
    db: Session,
    *,
    current_user: User,
    course_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> tuple[Generator[str, None, None], str]:
    """
    Build and return a (csv_generator, filename) tuple.

    The generator yields one string chunk per call (header + rows).
    The caller wraps this in a StreamingResponse.
    """
    records = _fetch_records(
        db,
        current_user=current_user,
        course_id=course_id,
        session_id=session_id,
        date_from=date_from,
        date_to=date_to,
    )

    filename = _build_filename(course_id, date_from, date_to)
    return _csv_generator(records), filename


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _fetch_records(
    db: Session,
    *,
    current_user: User,
    course_id: Optional[UUID],
    session_id: Optional[UUID],
    date_from: Optional[str],
    date_to: Optional[str],
) -> list:
    """
    Query attendance records with joins to session, course, and student user.

    Returns a list of Row objects with named columns.
    """
    # Base query: join attendance_records -> sessions -> courses -> student user
    query = text("""
        SELECT
            ar.id                       AS record_id,
            u.first_name || ' ' || u.last_name AS student_name,
            u.email                     AS student_email,
            u.matric_no                 AS matric_no,
            c.code                      AS course_code,
            c.title                     AS course_title,
            ases.title                  AS session_title,
            ases.session_date           AS session_date,
            ases.starts_at              AS starts_at,
            ar.status                   AS attendance_status,
            ar.minutes_late             AS minutes_late,
            ar.is_manual                AS is_manual,
            ar.marked_at                AS marked_at,
            ar.note                     AS note
        FROM attendance_records ar
        JOIN attendance_sessions ases ON ases.id = ar.session_id
        JOIN courses c ON c.id = ases.course_id
        JOIN users u ON u.id = ar.student_id
        WHERE c.organization_id = :org_id
          AND (:course_id IS NULL OR c.id = :course_id)
          AND (:session_id IS NULL OR ases.id = :session_id)
          AND (:date_from IS NULL OR DATE(ases.session_date) >= :date_from::date)
          AND (:date_to IS NULL OR DATE(ases.session_date) <= :date_to::date)
          AND (:lecturer_id IS NULL OR EXISTS (
              SELECT 1 FROM course_instructors ci
              WHERE ci.course_id = c.id AND ci.instructor_id = :lecturer_id
          ))
        ORDER BY ases.session_date DESC, u.last_name ASC, u.first_name ASC
    """)

    lecturer_id: Optional[UUID] = None
    if current_user.role == UserRole.lecturer:
        lecturer_id = current_user.id
    elif current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and lecturers can export attendance reports.",
        )

    rows = db.execute(
        query,
        {
            "org_id": str(current_user.organization_id),
            "course_id": str(course_id) if course_id else None,
            "session_id": str(session_id) if session_id else None,
            "date_from": date_from,
            "date_to": date_to,
            "lecturer_id": str(lecturer_id) if lecturer_id else None,
        },
    ).all()

    return rows


def _csv_generator(rows: list) -> Generator[str, None, None]:
    """Yield the CSV content as a stream of strings (header + rows)."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    # Header row
    writer.writerow([
        "Student Name",
        "Email",
        "Matric No",
        "Course Code",
        "Course Title",
        "Session Title",
        "Session Date",
        "Session Start",
        "Attendance Status",
        "Minutes Late",
        "Manual Override",
        "Marked At",
        "Notes",
    ])
    yield buffer.getvalue()
    buffer.truncate(0)
    buffer.seek(0)

    for row in rows:
        writer.writerow([
            row.student_name or "",
            row.student_email or "",
            row.matric_no or "",
            row.course_code or "",
            row.course_title or "",
            row.session_title or "",
            _fmt_date(row.session_date),
            _fmt_date(row.starts_at),
            row.attendance_status or "",
            row.minutes_late if row.minutes_late is not None else "",
            "Yes" if row.is_manual else "No",
            _fmt_date(row.marked_at),
            row.note or "",
        ])
        yield buffer.getvalue()
        buffer.truncate(0)
        buffer.seek(0)


def _fmt_date(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return str(value)


def _build_filename(
    course_id: Optional[UUID],
    date_from: Optional[str],
    date_to: Optional[str],
) -> str:
    parts = ["attendance"]
    if date_from:
        parts.append(date_from)
    if date_to:
        parts.append(f"to_{date_to}")
    if not date_from and not date_to:
        parts.append(datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    return "_".join(parts) + ".csv"
