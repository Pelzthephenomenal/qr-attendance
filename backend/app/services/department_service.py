from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.user import User
from app.models.course import Course
from app.models.enums import UserRole
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def create_department(db: Session, *, obj_in: DepartmentCreate, current_user: User) -> Department:
    db_obj = Department(
        organization_id=current_user.organization_id,
        name=obj_in.name,
        code=obj_in.code,
    )
    db.add(db_obj)
    try:
        db.commit()
        db.refresh(db_obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A department with this name or code already exists in your organization.",
        )
    return db_obj


def get_department(db: Session, *, id: UUID, current_user: User) -> Department:
    department = db.get(Department, id)
    if department is None or department.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
    
    # Calculate stats
    courses_cnt = db.scalar(
        select(func.count(Course.id))
        .where(Course.department_id == department.id, Course.is_active.is_(True))
    ) or 0

    students_cnt = db.scalar(
        select(func.count(User.id))
        .where(User.department_id == department.id, User.role == UserRole.student, User.is_active.is_(True))
    ) or 0

    lecturers_cnt = db.scalar(
        select(func.count(User.id))
        .where(User.department_id == department.id, User.role == UserRole.lecturer, User.is_active.is_(True))
    ) or 0

    avg_att = db.scalar(
        text(
            "SELECT COALESCE(AVG(attendance_percent), 0) "
            "FROM attendance_session_summary s "
            "JOIN courses c ON c.id = s.course_id "
            "WHERE c.department_id = :dept_id AND s.session_status = 'closed'"
        ),
        {"dept_id": department.id}
    ) or 0.0

    # Attach stats to the object dynamically
    setattr(department, "student_count", students_cnt)
    setattr(department, "lecturer_count", lecturers_cnt)
    setattr(department, "course_count", courses_cnt)
    setattr(department, "avg_attendance", round(float(avg_att), 2))

    return department


def list_departments(db: Session, *, current_user: User, skip: int = 0, limit: int = 100) -> list[Department]:
    depts = list(
        db.scalars(
            select(Department)
            .where(Department.organization_id == current_user.organization_id)
            .order_by(Department.name)
            .offset(skip)
            .limit(limit)
        ).all()
    )

    for dept in depts:
        courses_cnt = db.scalar(
            select(func.count(Course.id))
            .where(Course.department_id == dept.id, Course.is_active.is_(True))
        ) or 0

        students_cnt = db.scalar(
            select(func.count(User.id))
            .where(User.department_id == dept.id, User.role == UserRole.student, User.is_active.is_(True))
        ) or 0

        lecturers_cnt = db.scalar(
            select(func.count(User.id))
            .where(User.department_id == dept.id, User.role == UserRole.lecturer, User.is_active.is_(True))
        ) or 0

        avg_att = db.scalar(
            text(
                "SELECT COALESCE(AVG(attendance_percent), 0) "
                "FROM attendance_session_summary s "
                "JOIN courses c ON c.id = s.course_id "
                "WHERE c.department_id = :dept_id AND s.session_status = 'closed'"
            ),
            {"dept_id": dept.id}
        ) or 0.0

        setattr(dept, "student_count", students_cnt)
        setattr(dept, "lecturer_count", lecturers_cnt)
        setattr(dept, "course_count", courses_cnt)
        setattr(dept, "avg_attendance", round(float(avg_att), 2))

    return depts


def update_department(db: Session, *, id: UUID, obj_in: DepartmentUpdate, current_user: User) -> Department:
    department = get_department(db, id=id, current_user=current_user)
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(department, field, value)
        
    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A department with this name or code already exists in your organization.",
        )
    return department


def delete_department(db: Session, *, id: UUID, current_user: User) -> None:
    department = get_department(db, id=id, current_user=current_user)
    db.delete(department)
    db.commit()
