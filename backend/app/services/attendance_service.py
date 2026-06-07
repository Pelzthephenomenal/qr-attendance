from datetime import datetime, timezone
import hashlib
import json
import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attendance_record import AttendanceRecord
from app.models.attendance_scan import AttendanceScan
from app.models.attendance_session import AttendanceSession
from app.models.audit_log import AuditLog
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment
from app.models.enums import AttendanceStatus, ScanResult, SessionStatus, UserRole
from app.models.qr_token import QRToken
from app.models.student_device import StudentDevice
from app.models.user import User
from app.schemas.attendance import AttendanceScanRequest, AttendanceScanResponse, ManualAttendanceRequest
from app.services.notification_helpers import create_notification


def _is_expired(expires_at: datetime, now: datetime) -> bool:
    if expires_at.tzinfo is None or now.tzinfo is None:
        return expires_at.replace(tzinfo=None) <= now.replace(tzinfo=None)
    return expires_at <= now


def _diff_minutes(dt1: datetime, dt2: datetime) -> int:
    t1 = dt1.replace(tzinfo=None)
    t2 = dt2.replace(tzinfo=None)
    return int((t1 - t2).total_seconds() // 60)


def scan_attendance(db: Session, *, payload: AttendanceScanRequest, current_user: User) -> AttendanceScanResponse:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can scan attendance QR codes.")

    parsed = _parse_payload(payload.payload)
    now = datetime.now(timezone.utc)
    session = None
    qr_token = None
    result = ScanResult.invalid_token
    message = "Invalid QR token."

    if parsed is not None:
        session = db.get(AttendanceSession, parsed["session_id"])
        qr_token = db.get(QRToken, parsed["token_id"])
        token_hash = hashlib.sha256(payload.payload.encode("utf-8")).hexdigest()

        if qr_token is None or qr_token.token_hash != token_hash or qr_token.nonce != parsed["nonce"]:
            result = ScanResult.invalid_token
            message = "Invalid QR token."
        elif _is_expired(qr_token.expires_at, now) or not qr_token.is_active:
            result = ScanResult.expired_token
            message = "This QR code has expired."
        elif session is None or session.status != SessionStatus.active:
            result = ScanResult.session_inactive
            message = "Attendance session is not active."
        elif not _is_enrolled(db, session.course_id, current_user.id):
            result = ScanResult.not_enrolled
            message = "You are not enrolled in this course."
        elif _existing_record(db, session.id, current_user.id) is not None:
            result = ScanResult.duplicate
            message = "Attendance already recorded for this session."
        else:
            # Perform advanced checks
            location_valid, loc_msg = _verify_location(session, payload.latitude, payload.longitude)
            device_valid, dev_msg = _verify_device(db, session, current_user, _hash_optional(payload.device_fingerprint), now)

            if not location_valid:
                result = ScanResult.outside_location
                message = loc_msg
            elif not device_valid:
                result = ScanResult.device_rejected
                message = dev_msg
            else:
                result = ScanResult.accepted
                message = "Attendance recorded."

    scan = AttendanceScan(
        session_id=session.id if session else None,
        qr_token_id=qr_token.id if qr_token else None,
        student_id=current_user.id,
        result=result,
        latitude=payload.latitude,
        longitude=payload.longitude,
        device_fingerprint_hash=_hash_optional(payload.device_fingerprint),
        failure_reason=None if result == ScanResult.accepted else message,
    )
    db.add(scan)
    db.flush()

    record = None
    attendance_status = None
    if result == ScanResult.accepted and session is not None:
        minutes_late = max(0, _diff_minutes(now, session.starts_at))
        attendance_status = AttendanceStatus.late if minutes_late > session.late_after_minutes else AttendanceStatus.present
        record = AttendanceRecord(
            session_id=session.id,
            student_id=current_user.id,
            status=attendance_status,
            marked_at=now,
            scan_id=scan.id,
            minutes_late=minutes_late if attendance_status == AttendanceStatus.late else None,
        )
        db.add(record)
        db.flush()
        scan.attendance_record_id = record.id

        # Fetch course name for the notification message
        course = db.get(Course, session.course_id)
        course_name = course.code if course else "your course"
        session_date_str = now.strftime("%d %b %Y, %H:%M")

        if attendance_status == AttendanceStatus.present:
            create_notification(
                db,
                user_id=current_user.id,
                title="Attendance Recorded ✔",
                message=f"You have been marked present for {course_name} on {session_date_str}.",
                notification_type="success",
            )
        else:
            create_notification(
                db,
                user_id=current_user.id,
                title="Late Arrival Recorded",
                message=f"You have been marked late for {course_name} on {session_date_str}. "
                        f"You arrived {minutes_late} minute(s) after the session started.",
                notification_type="warning",
            )

    db.commit()
    return AttendanceScanResponse(
        result=result,
        status=attendance_status,
        message=message,
        session_id=session.id if session else None,
        attendance_record_id=record.id if record else None,
    )


def list_my_attendance(db: Session, current_user: User) -> list[AttendanceRecord]:
    return db.scalars(
        select(AttendanceRecord)
        .where(AttendanceRecord.student_id == current_user.id)
        .order_by(AttendanceRecord.created_at.desc())
    ).all()


def list_session_attendance(db: Session, *, session_id: UUID, current_user: User) -> list[AttendanceRecord]:
    session = _require_session_manager(db, session_id, current_user)
    return db.scalars(select(AttendanceRecord).where(AttendanceRecord.session_id == session.id)).all()


def manual_override(
    db: Session,
    *,
    session_id: UUID,
    payload: ManualAttendanceRequest,
    current_user: User,
) -> AttendanceRecord:
    session = _require_session_manager(db, session_id, current_user)
    record = _existing_record(db, session.id, payload.student_id)
    now = datetime.now(timezone.utc)
    if record is None:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=payload.student_id,
            status=payload.status,
            marked_at=now,
            marked_by=current_user.id,
            is_manual=True,
            note=payload.note,
        )
        db.add(record)
    else:
        record.status = payload.status
        record.marked_at = record.marked_at or now
        record.marked_by = current_user.id
        record.is_manual = True
        record.note = payload.note

    db.add(AuditLog(
        organization_id=current_user.organization_id,
        actor_id=current_user.id,
        action="attendance_record.manual_override",
        entity_type="attendance_record",
        entity_id=record.id,
        new_values={"status": payload.status.value, "note": payload.note},
    ))
    db.commit()
    db.refresh(record)
    return record


def _parse_payload(raw_payload: str) -> dict[str, UUID | str] | None:
    try:
        data = json.loads(raw_payload)
        if data.get("type") != "qr_attendance":
            return None
        return {
            "session_id": UUID(data["session_id"]),
            "token_id": UUID(data["token_id"]),
            "nonce": str(data["nonce"]),
        }
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


def _is_enrolled(db: Session, course_id: UUID, student_id: UUID) -> bool:
    return db.scalar(
        select(Enrollment.id).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == student_id,
            Enrollment.is_active.is_(True),
        )
    ) is not None


def _existing_record(db: Session, session_id: UUID, student_id: UUID) -> AttendanceRecord | None:
    return db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == student_id,
        )
    )


def _require_session_manager(db: Session, session_id: UUID, current_user: User) -> AttendanceSession:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if current_user.role == UserRole.admin:
        return session
    if current_user.role != UserRole.lecturer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")
    assigned = db.get(CourseInstructor, {"course_id": session.course_id, "instructor_id": current_user.id})
    if assigned is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this course.")
    return session


def _hash_optional(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _verify_location(session: AttendanceSession, lat: float | None, lon: float | None) -> tuple[bool, str]:
    if not session.require_location:
        return True, ""
    
    if lat is None or lon is None:
        return False, "Location access is required for this session."
    
    if session.latitude is None or session.longitude is None or session.allowed_radius_meters is None:
        # Configuration error on the session, fail open or fail closed? We fail closed to be safe.
        return False, "Session location is improperly configured."
        
    dist = _haversine_distance_meters(float(session.latitude), float(session.longitude), lat, lon)
    if dist > session.allowed_radius_meters:
        return False, f"You are outside the allowed attendance radius. Distance: {int(dist)}m"
        
    return True, ""


def _verify_device(db: Session, session: AttendanceSession, user: User, device_hash: str | None, now: datetime) -> tuple[bool, str]:
    if not session.require_device_check:
        return True, ""
        
    if not device_hash:
        return False, "Device verification failed. Ensure you are not in incognito mode."
        
    # Get user's devices
    devices = db.scalars(select(StudentDevice).where(StudentDevice.student_id == user.id)).all()
    
    # If no devices exist, register this as their primary trusted device
    if not devices:
        new_device = StudentDevice(
            student_id=user.id,
            device_fingerprint_hash=device_hash,
            device_label="Primary Device",
            is_trusted=True,
            last_used_at=now,
        )
        db.add(new_device)
        return True, ""
        
    # User has devices. Find if this fingerprint is one of them.
    for device in devices:
        if device.device_fingerprint_hash == device_hash:
            if device.is_trusted:
                device.last_used_at = now
                return True, ""
            else:
                return False, "This device is registered but marked as untrusted."
                
    return False, "Unrecognized device. You must use your primary registered device."

