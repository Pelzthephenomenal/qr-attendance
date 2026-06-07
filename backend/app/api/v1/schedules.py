from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin_or_staff
from app.models.user import User
from app.schemas.course_schedule import CourseScheduleCreate, CourseSchedulePublic
from app.services import schedule_service

router = APIRouter(tags=["schedules"])


@router.post("/courses/{course_id}/schedules", response_model=CourseSchedulePublic, status_code=status.HTTP_201_CREATED)
def create_schedule(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
    course_id: UUID,
    schedule_in: CourseScheduleCreate,
) -> CourseSchedulePublic:
    return schedule_service.create_schedule(db=db, course_id=course_id, obj_in=schedule_in, current_user=current_user)


@router.get("/me/schedule/today", response_model=list[CourseSchedulePublic])
def get_today_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CourseSchedulePublic]:
    import datetime
    today_day_of_week = datetime.datetime.today().weekday()
    return schedule_service.get_my_today_schedule(db, current_user, today_day_of_week)


@router.get("/me/schedule/weekly", response_model=list[CourseSchedulePublic])
def get_weekly_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CourseSchedulePublic]:
    return schedule_service.get_my_weekly_schedule(db, current_user)
