from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin, require_lecturer, require_student
from app.models.user import User
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/admin")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    return analytics_service.get_admin_analytics(db, current_user)


@router.get("/admin/activity")
def get_admin_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> list:
    return analytics_service.get_recent_activity(db, current_user)


@router.get("/lecturer")
def get_lecturer_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer),
) -> dict:
    return analytics_service.get_lecturer_analytics(db, current_user)


@router.get("/lecturer/courses")
def get_lecturer_course_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lecturer),
) -> list:
    return analytics_service.get_lecturer_course_stats(db, current_user)


@router.get("/student/courses")
def get_student_course_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
) -> list:
    return analytics_service.get_student_course_attendance(db, current_user)
