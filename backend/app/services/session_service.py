from datetime import datetime, timedelta, timezone
import hashlib
import json
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.attendance_record import AttendanceRecord
from app.models.attendance_session import AttendanceSession
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment
from app.models.enums import AttendanceStatus, SessionStatus, UserRole
from app.models.qr_token import QRToken
from app.models.user import User
from app.schemas.session import CurrentQRResponse, QRTokenPublic, SessionCreateRequest
from app.services.notification_helpers import create_notification


def create_course_session(
    db: Session,
    *,
    course_id: UUID,
    payload: SessionCreateRequest,
    current_user: User,
) -> AttendanceSession:
    course = _get_assigned_course(db, course_id, current_user)
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="ends_at must be after starts_at.")

    session = AttendanceSession(
        course_id=course.id,
        created_by=current_user.id,
        title=payload.title,
        status=SessionStatus.draft,
        session_date=payload.starts_at,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        late_after_minutes=payload.late_after_minutes,
        qr_rotation_seconds=payload.qr_rotation_seconds,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        allowed_radius_meters=payload.allowed_radius_meters,
        require_location=payload.require_location,
        require_device_check=payload.require_device_check,
        notes=payload.notes,
    )
    db.add(session)
    db.flush()
    _audit(db, current_user, "attendance_session.created", "attendance_session", session.id)
    db.commit()
    db.refresh(session)
    return session


def start_session(db: Session, *, session_id: UUID, current_user: User) -> tuple[AttendanceSession, QRTokenPublic]:
    session = _get_owned_session(db, session_id, current_user)
    if session.status == SessionStatus.closed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Closed sessions cannot be restarted.")

    now = datetime.now(timezone.utc)
    session.status = SessionStatus.active
    session.started_at = session.started_at or now
    db.flush()
    token = rotate_qr_token(db, session_id=session.id, current_user=current_user, commit=False)
    _audit(db, current_user, "attendance_session.started", "attendance_session", session.id)
    db.commit()
    db.refresh(session)
    return session, token
def close_session(db: Session, *, session_id: UUID, current_user: User) -> AttendanceSession:
    session = _get_owned_session(db, session_id, current_user)
    if session.status == SessionStatus.closed:
        return session

    now = datetime.now(timezone.utc)
    session.status = SessionStatus.closed
    session.closed_at = now
    
    # Revoke QR tokens
    db.execute(
        update(QRToken)
        .where(QRToken.session_id == session.id, QRToken.is_active.is_(True))
        .values(is_active=False, revoked_at=now)
    )
    
    # 1. Fetch all active enrolled student IDs for the course
    enrolled_student_ids = db.scalars(
        select(Enrollment.student_id)
        .where(Enrollment.course_id == session.course_id, Enrollment.is_active.is_(True))
    ).all()
    
    # 2. Fetch student IDs who already have attendance records for this session
    present_student_ids = db.scalars(
        select(AttendanceRecord.student_id)
        .where(AttendanceRecord.session_id == session.id)
    ).all()
    
    # 3. Mark remaining students as absent
    absent_student_ids = set(enrolled_student_ids) - set(present_student_ids)

    # Fetch course for notification message
    course = db.get(Course, session.course_id)
    course_name = course.code if course else "your course"
    session_date_str = now.strftime("%d %b %Y")

    for student_id in absent_student_ids:
        absent_record = AttendanceRecord(
            session_id=session.id,
            student_id=student_id,
            status=AttendanceStatus.absent,
            marked_at=now,
            is_manual=False,
            note="Automatically marked absent on session closure.",
        )
        db.add(absent_record)

        # Notify the absent student
        create_notification(
            db,
            user_id=student_id,
            title="Attendance Alert — Absent",
            message=(
                f"You were marked absent for {course_name} on {session_date_str}. "
                "If you believe this is an error, please contact your lecturer."
            ),
            notification_type="warning",
        )

    _audit(db, current_user, "attendance_session.closed", "attendance_session", session.id)
    db.commit()
    db.refresh(session)
    return session
def get_current_qr_token(db: Session, *, session_id: UUID, current_user: User) -> CurrentQRResponse:
    session = _get_owned_session(db, session_id, current_user)
    now = datetime.now(timezone.utc)
    token = db.scalar(
        select(QRToken)
        .where(QRToken.session_id == session.id, QRToken.is_active.is_(True), QRToken.expires_at > now)
        .order_by(QRToken.issued_at.desc())
    )
    if token is None:
        return CurrentQRResponse(session_id=session.id, needs_rotation=True)

    return CurrentQRResponse(
        session_id=session.id,
        token_id=token.id,
        payload=_build_qr_payload(session.id, token.id, token.nonce),
        expires_at=token.expires_at,
    )


def rotate_qr_token(
    db: Session,
    *,
    session_id: UUID,
    current_user: User,
    commit: bool = True,
) -> QRTokenPublic:
    session = _get_owned_session(db, session_id, current_user)
    if session.status != SessionStatus.active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="QR tokens can only be issued for active sessions.")

    now = datetime.now(timezone.utc)
    db.execute(
        update(QRToken)
        .where(QRToken.session_id == session.id, QRToken.is_active.is_(True))
        .values(is_active=False, revoked_at=now)
    )

    nonce = secrets.token_urlsafe(32)
    token = QRToken(
        session_id=session.id,
        nonce=nonce,
        token_hash="pending",
        issued_at=now,
        expires_at=now + timedelta(seconds=session.qr_rotation_seconds),
        created_by=current_user.id,
    )
    db.add(token)
    db.flush()

    payload = _build_qr_payload(session.id, token.id, nonce)
    token.token_hash = _hash_token(payload)
    _audit(db, current_user, "qr_token.rotated", "qr_token", token.id)

    if commit:
        db.commit()
        db.refresh(token)

    return QRTokenPublic(
        session_id=session.id,
        token_id=token.id,
        payload=payload,
        issued_at=token.issued_at,
        expires_at=token.expires_at,
    )


def _get_assigned_course(db: Session, course_id: UUID, current_user: User) -> Course:
    course = db.get(Course, course_id)
    if course is None or not course.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    if current_user.role == UserRole.admin:
        return course

    assignment = db.get(CourseInstructor, {"course_id": course_id, "instructor_id": current_user.id})
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this course.")
    return course


def _get_owned_session(db: Session, session_id: UUID, current_user: User) -> AttendanceSession:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")
    _get_assigned_course(db, session.course_id, current_user)
    return session


def _build_qr_payload(session_id: UUID, token_id: UUID, nonce: str) -> str:
    return json.dumps(
        {"type": "qr_attendance", "session_id": str(session_id), "token_id": str(token_id), "nonce": nonce},
        separators=(",", ":"),
        sort_keys=True,
    )


def _hash_token(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _audit(db: Session, actor: User, action: str, entity_type: str, entity_id: UUID) -> None:
    db.add(
        AuditLog(
            organization_id=actor.organization_id,
            actor_id=actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )

