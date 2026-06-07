import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.notification import Notification


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_users_org_email"),
        UniqueConstraint("organization_id", "username", name="uq_users_org_username"),
        UniqueConstraint("organization_id", "matric_no", name="uq_users_org_matric_no"),
        UniqueConstraint("organization_id", "staff_no", name="uq_users_org_staff_no"),
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
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=True),
        nullable=False,
        index=True,
    )
    matric_no: Mapped[str | None] = mapped_column(String(80))
    staff_no: Mapped[str | None] = mapped_column(String(80))
    phone: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="users")
    department = relationship("Department", back_populates="users")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    courses_as_instructor = relationship("CourseInstructor", back_populates="instructor")
    attendance_sessions_created = relationship("AttendanceSession", primaryjoin="User.id==AttendanceSession.created_by", back_populates="created_by_user")
    attendance_records = relationship("AttendanceRecord", primaryjoin="User.id==AttendanceRecord.marked_by", back_populates="marked_by_user")
    qr_tokens_created = relationship("QRToken", back_populates="created_by_user")
    enrollments = relationship("Enrollment", back_populates="student")
    student_devices = relationship("StudentDevice", back_populates="student")
    report_exports_requested = relationship("ReportExport", back_populates="requested_by_user")
    audit_logs = relationship("AuditLog", back_populates="actor", primaryjoin="User.id==AuditLog.actor_id")

