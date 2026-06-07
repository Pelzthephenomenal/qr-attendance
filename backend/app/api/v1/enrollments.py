from uuid import UUID

from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_admin_or_staff
from app.models.user import User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentPublic
from app.services import enrollment_service

router = APIRouter(tags=["enrollments"])


@router.post("/courses/{course_id}/enrollments", response_model=EnrollmentPublic, status_code=status.HTTP_201_CREATED)
def assign_student(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
    course_id: UUID,
    enroll_in: EnrollmentCreate,
) -> EnrollmentPublic:
    return enrollment_service.assign_student(db=db, course_id=course_id, student_id=enroll_in.student_id, current_user=current_user)


@router.post("/courses/{course_id}/enrollments/bulk-import", response_model=dict, status_code=status.HTTP_201_CREATED)
def bulk_import_enrollments(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
    course_id: UUID,
    file: UploadFile = File(...),
) -> dict:
    return enrollment_service.bulk_import_enrollments(db=db, course_id=course_id, file=file, current_user=current_user)



@router.delete("/courses/{course_id}/enrollments/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_student(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
    course_id: UUID,
    student_id: UUID,
) -> None:
    enrollment_service.remove_student(db=db, course_id=course_id, student_id=student_id, current_user=current_user)


@router.get("/courses/{course_id}/enrollments", response_model=list[EnrollmentPublic])
def list_enrolled_students(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
    course_id: UUID,
) -> list[EnrollmentPublic]:
    return enrollment_service.list_enrolled_students(db=db, course_id=course_id, current_user=current_user)


@router.get("/users/{user_id}/enrollments", response_model=list[EnrollmentPublic])
def list_student_courses(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_staff),
    user_id: UUID,
) -> list[EnrollmentPublic]:
    return enrollment_service.list_student_courses(db=db, student_id=user_id, current_user=current_user)
