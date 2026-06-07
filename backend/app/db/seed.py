from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.course import Course, CourseInstructor
from app.models.department import Department
from app.models.enrollment import Enrollment
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.user import User


SEED_PASSWORD = "password123"


def seed() -> None:
    db = SessionLocal()
    try:
        organization = db.scalar(select(Organization).where(Organization.slug == "demo-university"))
        if organization is None:
            organization = Organization(name="Demo University", slug="demo-university", timezone="Africa/Lagos")
            db.add(organization)
            db.flush()

        department = db.scalar(
            select(Department).where(
                Department.organization_id == organization.id,
                Department.code == "CSC",
            )
        )
        if department is None:
            department = Department(organization_id=organization.id, name="Computer Science", code="CSC")
            db.add(department)
            db.flush()

        admin = _get_or_create_user(
            db,
            organization=organization,
            department=department,
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            role=UserRole.admin,
            staff_no="ADM001",
        )
        lecturer = _get_or_create_user(
            db,
            organization=organization,
            department=department,
            email="lecturer@example.com",
            first_name="Ada",
            last_name="Lecturer",
            role=UserRole.lecturer,
            staff_no="LEC001",
        )
        student = _get_or_create_user(
            db,
            organization=organization,
            department=department,
            email="student@example.com",
            first_name="Sam",
            last_name="Student",
            role=UserRole.student,
            matric_no="STU001",
        )

        course = db.scalar(
            select(Course).where(
                Course.organization_id == organization.id,
                Course.code == "CSC301",
                Course.academic_year == "2025/2026",
                Course.term == "First Semester",
            )
        )
        if course is None:
            course = Course(
                organization_id=organization.id,
                department_id=department.id,
                code="CSC301",
                title="Data Structures and Algorithms",
                academic_year="2025/2026",
                term="First Semester",
                level="300",
            )
            db.add(course)
            db.flush()

        if db.get(CourseInstructor, {"course_id": course.id, "instructor_id": lecturer.id}) is None:
            db.add(CourseInstructor(course_id=course.id, instructor_id=lecturer.id))

        enrollment = db.scalar(
            select(Enrollment).where(Enrollment.course_id == course.id, Enrollment.student_id == student.id)
        )
        if enrollment is None:
            db.add(Enrollment(course_id=course.id, student_id=student.id))

        db.commit()
        print("Seed complete.")
        print(f"Admin: {admin.email} / {SEED_PASSWORD}")
        print(f"Lecturer: {lecturer.email} / {SEED_PASSWORD}")
        print(f"Student: {student.email} / {SEED_PASSWORD}")
    finally:
        db.close()


def _get_or_create_user(
    db,
    *,
    organization: Organization,
    department: Department,
    email: str,
    first_name: str,
    last_name: str,
    role: UserRole,
    matric_no: str | None = None,
    staff_no: str | None = None,
) -> User:
    user = db.scalar(select(User).where(User.organization_id == organization.id, User.email == email))
    if user is not None:
        return user

    user = User(
        organization_id=organization.id,
        department_id=department.id,
        email=email,
        password_hash=hash_password(SEED_PASSWORD),
        first_name=first_name,
        last_name=last_name,
        role=role,
        matric_no=matric_no,
        staff_no=staff_no,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


if __name__ == "__main__":
    seed()
