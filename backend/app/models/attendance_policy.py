import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AttendancePolicy(Base):
    __tablename__ = "attendance_policies"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_attendance_policies_org_name"),
        CheckConstraint("default_late_after_minutes >= 0", name="ck_attendance_policies_late_after_minutes"),
        CheckConstraint(
            "default_qr_rotation_seconds BETWEEN 10 AND 3600",
            name="ck_attendance_policies_qr_rotation_seconds",
        ),
        CheckConstraint(
            "minimum_attendance_percent IS NULL OR minimum_attendance_percent BETWEEN 0 AND 100",
            name="ck_attendance_policies_minimum_attendance_percent",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    allow_manual_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    default_late_after_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    default_qr_rotation_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    require_location_by_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    require_device_check_by_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    minimum_attendance_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization = relationship("Organization")
