from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.course import CourseCreate, CoursePublic, CourseUpdate


def list_my_courses(db: Session, current_user: User) -> list[CoursePublic]:
    statement = (
        select(Course, func.count(Enrollment.id).label("student_count"))
        .outerjoin(Enrollment, (Enrollment.course_id == Course.id) & (Enrollment.is_active.is_(True)))
        .options(selectinload(Course.instructors))
        .where(Course.is_active.is_(True))
        .group_by(Course.id)
        .order_by(Course.code)
    )

    if current_user.role == UserRole.lecturer:
        statement = statement.join(CourseInstructor, CourseInstructor.course_id == Course.id).where(
            CourseInstructor.instructor_id == current_user.id
        )
    elif current_user.role == UserRole.student:
        active_course_ids = select(Enrollment.course_id).where(
            Enrollment.student_id == current_user.id,
            Enrollment.is_active.is_(True),
        )
        statement = statement.where(Course.id.in_(active_course_ids))
    elif current_user.role != UserRole.admin:
        statement = statement.where(Course.organization_id == current_user.organization_id)

    return [
        CoursePublic.model_validate(course, from_attributes=True).model_copy(
            update={
                "student_count": int(student_count or 0),
                "instructor_ids": [ci.instructor_id for ci in course.instructors]
            }
        )
        for course, student_count in db.execute(statement).all()
    ]


def create_course(db: Session, *, obj_in: CourseCreate, current_user: User) -> Course:
    db_obj = Course(
        organization_id=current_user.organization_id,
        department_id=obj_in.department_id,
        code=obj_in.code,
        title=obj_in.title,
        description=obj_in.description,
        academic_year=obj_in.academic_year,
        term=obj_in.term,
        level=obj_in.level,
        is_active=obj_in.is_active,
    )
    db.add(db_obj)
    try:
        db.flush()
        if obj_in.instructor_ids:
            for i_id in obj_in.instructor_ids:
                db.add(CourseInstructor(course_id=db_obj.id, instructor_id=i_id))
        db.commit()
        db.refresh(db_obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A course with this code, year, and term already exists.",
        )
    return db_obj


def get_course(db: Session, *, id: UUID, current_user: User) -> Course:
    course = db.get(Course, id)
    if course is None or course.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course


def list_courses(db: Session, *, current_user: User, skip: int = 0, limit: int = 100) -> list[CoursePublic]:
    statement = (
        select(Course, func.count(Enrollment.id).label("student_count"))
        .outerjoin(Enrollment, (Enrollment.course_id == Course.id) & (Enrollment.is_active.is_(True)))
        .options(selectinload(Course.instructors))
        .where(Course.organization_id == current_user.organization_id)
        .group_by(Course.id)
        .order_by(Course.code)
        .offset(skip)
        .limit(limit)
    )
    
    return [
        CoursePublic.model_validate(course, from_attributes=True).model_copy(
            update={
                "student_count": int(student_count or 0),
                "instructor_ids": [ci.instructor_id for ci in course.instructors]
            }
        )
        for course, student_count in db.execute(statement).all()
    ]


def update_course(db: Session, *, id: UUID, obj_in: CourseUpdate, current_user: User) -> Course:
    course = get_course(db, id=id, current_user=current_user)
    
    update_data = obj_in.model_dump(exclude_unset=True)
    if "instructor_ids" in update_data:
        instructor_ids = update_data.pop("instructor_ids")
        if instructor_ids is not None:
            db.query(CourseInstructor).filter(CourseInstructor.course_id == course.id).delete()
            for i_id in instructor_ids:
                db.add(CourseInstructor(course_id=course.id, instructor_id=i_id))

    for field, value in update_data.items():
        setattr(course, field, value)
        
    try:
        db.commit()
        db.refresh(course)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A course with this code, year, and term already exists.",
        )
    return course


def delete_course(db: Session, *, id: UUID, current_user: User) -> None:
    course = get_course(db, id=id, current_user=current_user)
    course.is_active = False
    db.commit()
