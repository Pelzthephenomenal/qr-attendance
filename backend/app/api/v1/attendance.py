from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.attendance import (
    AttendanceRecordPublic,
    AttendanceScanRequest,
    AttendanceScanResponse,
    ManualAttendanceRequest,
)
from app.services.attendance_service import (
    list_my_attendance,
    list_session_attendance,
    manual_override,
    scan_attendance,
)


router = APIRouter()
require_attendance_manager = require_roles(UserRole.lecturer, UserRole.admin)


@router.post("/attendance/scan", response_model=AttendanceScanResponse)
@limiter.limit("30/minute")
def scan(
    request: Request,
    payload: AttendanceScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceScanResponse:
    return scan_attendance(db, payload=payload, current_user=current_user)



@router.get("/me/attendance", response_model=list[AttendanceRecordPublic])
def my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AttendanceRecordPublic]:
    return list_my_attendance(db, current_user)


@router.get("/sessions/{session_id}/attendance", response_model=list[AttendanceRecordPublic])
def session_attendance(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_attendance_manager),
) -> list[AttendanceRecordPublic]:
    return list_session_attendance(db, session_id=session_id, current_user=current_user)


@router.post("/sessions/{session_id}/attendance/manual", response_model=AttendanceRecordPublic)
def override_attendance(
    session_id: UUID,
    payload: ManualAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_attendance_manager),
) -> AttendanceRecordPublic:
    return manual_override(db, session_id=session_id, payload=payload, current_user=current_user)

