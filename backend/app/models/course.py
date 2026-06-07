import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.course_schedule import CourseSchedule
    from app.models.enrollment import Enrollment
    from app.models.user import User


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", "academic_year", "term", name="uq_courses_org_code_year_term"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
    )
    code: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    academic_year: Mapped[str | None] = mapped_column(String(20))
    term: Mapped[str | None] = mapped_column(String(40))
    level: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization = relationship("Organization")
    department = relationship("Department")
    instructors = relationship("CourseInstructor", back_populates="course", cascade="all, delete-orphan")
    schedules: Mapped[list["CourseSchedule"]] = relationship(
        "CourseSchedule", back_populates="course", cascade="all, delete-orphan"
    )
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    attendance_sessions = relationship("AttendanceSession", back_populates="course", cascade="all, delete-orphan")


class CourseInstructor(Base):
    __tablename__ = "course_instructors"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="instructors")
    instructor = relationship("User", back_populates="courses_as_instructor")
