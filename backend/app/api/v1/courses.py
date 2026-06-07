from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.course import CourseCreate, CoursePublic, CourseUpdate
from app.services import course_service


router = APIRouter()


@router.get("/me/courses", response_model=list[CoursePublic])
def my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CoursePublic]:
    return course_service.list_my_courses(db, current_user)


@router.post("", response_model=CoursePublic, status_code=status.HTTP_201_CREATED)
def create_course(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    course_in: CourseCreate,
) -> CoursePublic:
    # Notice: Converting the SQLAlchemy Course object to CoursePublic schema
    # requires mapping `student_count` which defaults to 0 on creation
    course = course_service.create_course(db=db, obj_in=course_in, current_user=current_user)
    return CoursePublic.model_validate(course, from_attributes=True).model_copy(
        update={"instructor_ids": [ci.instructor_id for ci in course.instructors]}
    )


@router.get("", response_model=list[CoursePublic])
def list_courses(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = 0,
    limit: int = 100,
) -> list[CoursePublic]:
    return course_service.list_courses(db=db, current_user=current_user, skip=skip, limit=limit)


@router.get("/{id}", response_model=CoursePublic)
def get_course(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
) -> CoursePublic:
    course = course_service.get_course(db=db, id=id, current_user=current_user)
    return CoursePublic.model_validate(course, from_attributes=True).model_copy(
        update={"instructor_ids": [ci.instructor_id for ci in course.instructors]}
    )


@router.patch("/{id}", response_model=CoursePublic)
def update_course(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
    course_in: CourseUpdate,
) -> CoursePublic:
    course = course_service.update_course(db=db, id=id, obj_in=course_in, current_user=current_user)
    return CoursePublic.model_validate(course, from_attributes=True).model_copy(
        update={"instructor_ids": [ci.instructor_id for ci in course.instructors]}
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
) -> None:
    course_service.delete_course(db=db, id=id, current_user=current_user)

