"""
Reports API routes.

Provides a CSV export endpoint for attendance data.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.services.report_service import generate_attendance_csv

router = APIRouter(prefix="/reports", tags=["reports"])

require_report_access = require_roles(UserRole.admin, UserRole.lecturer)


@router.get("/export/attendance")
def export_attendance(
    course_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_report_access),
) -> StreamingResponse:
    """
    Export attendance records as a CSV file.

    Query parameters (all optional):
    - course_id: Filter by a specific course UUID
    - session_id: Filter by a specific attendance session UUID
    - date_from: Start date (YYYY-MM-DD)
    - date_to: End date (YYYY-MM-DD)

    Admins see all data in the organisation.
    Lecturers see only courses they are assigned to teach.
    """
    csv_generator, filename = generate_attendance_csv(
        db,
        current_user=current_user,
        course_id=course_id,
        session_id=session_id,
        date_from=date_from,
        date_to=date_to,
    )

    return StreamingResponse(
        csv_generator,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
