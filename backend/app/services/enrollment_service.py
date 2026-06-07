from datetime import datetime, timezone
from uuid import UUID

import csv
import io
from fastapi import HTTPException, status, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.enums import UserRole
from app.models.user import User


def assign_student(db: Session, *, course_id: UUID, student_id: UUID, current_user: User) -> Enrollment:
    course = db.get(Course, course_id)
    if not course or course.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
        
    student = db.get(User, student_id)
    if not student or student.organization_id != current_user.organization_id or student.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid student")
        
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == student_id
        )
    )
    if enrollment:
        if enrollment.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student already enrolled")
        enrollment.is_active = True
        enrollment.dropped_at = None
    else:
        enrollment = Enrollment(course_id=course_id, student_id=student_id)
        db.add(enrollment)
        
    try:
        db.commit()
        db.refresh(enrollment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enrollment failed")
        
    return enrollment


def remove_student(db: Session, *, course_id: UUID, student_id: UUID, current_user: User) -> None:
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == student_id,
            Enrollment.is_active.is_(True)
        )
    )
    if enrollment:
        # Check permissions properly. If instructor, ensure they own the course.
        # But this is handled via deps (require_admin or something else) at the router level.
        # Just to be safe, enforce org check:
        if enrollment.course.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")
            
        enrollment.is_active = False
        enrollment.dropped_at = datetime.now(timezone.utc)
        db.commit()


def list_enrolled_students(db: Session, *, course_id: UUID, current_user: User) -> list[Enrollment]:
    return list(db.scalars(
        select(Enrollment)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.course_id == course_id, Enrollment.is_active.is_(True), Course.organization_id == current_user.organization_id)
    ).all())


def list_student_courses(db: Session, *, student_id: UUID, current_user: User) -> list[Enrollment]:
    return list(db.scalars(
        select(Enrollment)
        .join(User, User.id == Enrollment.student_id)
        .where(Enrollment.student_id == student_id, Enrollment.is_active.is_(True), User.organization_id == current_user.organization_id)
    ).all())


def bulk_import_enrollments(db: Session, *, course_id: UUID, file: UploadFile, current_user: User) -> dict:
    course = db.get(Course, course_id)
    if not course or course.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    contents = file.file.read().decode("utf-8")
    csv_reader = csv.DictReader(io.StringIO(contents))
    
    enrollments_to_add = []
    errors = []
    row_num = 1
    
    for row in csv_reader:
        row_num += 1
        email = row.get("student_email", "").strip()
        matric = row.get("matric_no", "").strip()
        
        if not email and not matric:
            errors.append(f"Row {row_num}: Missing student_email or matric_no")
            continue
            
        student = None
        if email:
            student = db.scalar(select(User).where(User.email == email, User.organization_id == current_user.organization_id, User.role == UserRole.student))
        if not student and matric:
            student = db.scalar(select(User).where(User.matric_no == matric, User.organization_id == current_user.organization_id, User.role == UserRole.student))
            
        if not student:
            errors.append(f"Row {row_num}: Student not found with email={email} or matric_no={matric}")
            continue
            
        # Check if already enrolled
        existing = db.scalar(select(Enrollment).where(Enrollment.course_id == course_id, Enrollment.student_id == student.id))
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.dropped_at = None
                enrollments_to_add.append(existing)
            else:
                errors.append(f"Row {row_num}: Student already enrolled")
        else:
            enrollment = Enrollment(course_id=course_id, student_id=student.id)
            db.add(enrollment)
            enrollments_to_add.append(enrollment)
            
    if enrollments_to_add:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bulk import failed due to database integrity error.",
            )
            
    return {"imported": len(enrollments_to_add), "errors": errors}

