from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course, CourseInstructor
from app.models.course_schedule import CourseSchedule
from app.models.enrollment import Enrollment
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.course_schedule import CourseScheduleCreate


def create_schedule(db: Session, *, course_id: UUID, obj_in: CourseScheduleCreate, current_user: User) -> CourseSchedule:
    course = db.get(Course, course_id)
    if not course or course.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
        
    db_obj = CourseSchedule(
        course_id=course_id,
        day_of_week=obj_in.day_of_week,
        start_time=obj_in.start_time,
        end_time=obj_in.end_time,
        room=obj_in.room,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_my_today_schedule(db: Session, current_user: User, day_of_week: int) -> list[CourseSchedule]:
    statement = select(CourseSchedule).join(Course).where(CourseSchedule.day_of_week == day_of_week, Course.is_active.is_(True))
    
    if current_user.role == UserRole.student:
        active_course_ids = select(Enrollment.course_id).where(Enrollment.student_id == current_user.id, Enrollment.is_active.is_(True))
        statement = statement.where(CourseSchedule.course_id.in_(active_course_ids))
    elif current_user.role == UserRole.lecturer:
        statement = statement.join(CourseInstructor).where(CourseInstructor.instructor_id == current_user.id)
    elif current_user.role != UserRole.admin:
        statement = statement.where(Course.organization_id == current_user.organization_id)
        
    statement = statement.order_by(CourseSchedule.start_time)
    return list(db.scalars(statement).all())


def get_my_weekly_schedule(db: Session, current_user: User) -> list[CourseSchedule]:
    statement = select(CourseSchedule).join(Course).where(Course.is_active.is_(True))
    
    if current_user.role == UserRole.student:
        active_course_ids = select(Enrollment.course_id).where(Enrollment.student_id == current_user.id, Enrollment.is_active.is_(True))
        statement = statement.where(CourseSchedule.course_id.in_(active_course_ids))
    elif current_user.role == UserRole.lecturer:
        statement = statement.join(CourseInstructor).where(CourseInstructor.instructor_id == current_user.id)
    elif current_user.role != UserRole.admin:
        statement = statement.where(Course.organization_id == current_user.organization_id)
        
    statement = statement.order_by(CourseSchedule.day_of_week, CourseSchedule.start_time)
    return list(db.scalars(statement).all())
