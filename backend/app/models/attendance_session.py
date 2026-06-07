import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SessionStatus


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_attendance_sessions_end_after_start"),
        CheckConstraint("late_after_minutes >= 0", name="ck_attendance_sessions_late_after_minutes"),
        CheckConstraint("qr_rotation_seconds BETWEEN 10 AND 3600", name="ck_attendance_sessions_qr_rotation_seconds"),
        CheckConstraint(
            "allowed_radius_meters IS NULL OR allowed_radius_meters >= 0",
            name="ck_attendance_sessions_allowed_radius_meters",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str | None] = mapped_column(String(220))
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status", native_enum=True),
        nullable=False,
        default=SessionStatus.draft,
        index=True,
    )
    session_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    late_after_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    qr_rotation_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    location_name: Mapped[str | None] = mapped_column(String(180))
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6))
    allowed_radius_meters: Mapped[int | None] = mapped_column(Integer)
    require_location: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    require_device_check: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String(1000))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    course = relationship("Course", back_populates="attendance_sessions")
    created_by_user = relationship("User", back_populates="attendance_sessions_created", foreign_keys=[created_by])
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    qr_tokens = relationship("QRToken", back_populates="session", cascade="all, delete-orphan")
    attendance_scans = relationship("AttendanceScan", back_populates="session", cascade="all, delete-orphan")
