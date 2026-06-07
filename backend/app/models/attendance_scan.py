import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import INET, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ScanResult


class AttendanceScan(Base):
    __tablename__ = "attendance_scans"
    __table_args__ = (
        CheckConstraint(
            "distance_meters IS NULL OR distance_meters >= 0",
            name="ck_attendance_scans_distance_meters",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_sessions.id", ondelete="SET NULL"),
        index=True,
    )
    qr_token_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("qr_tokens.id", ondelete="SET NULL"),
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_records.id", ondelete="SET NULL"),
    )
    result: Mapped[ScanResult] = mapped_column(
        Enum(ScanResult, name="scan_result", native_enum=True),
        nullable=False,
        index=True,
    )
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(String(500))
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6))
    distance_meters: Mapped[int | None] = mapped_column(Integer)
    device_fingerprint_hash: Mapped[str | None] = mapped_column(String(255))
    failure_reason: Mapped[str | None] = mapped_column(String(500))
    scan_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)

    session = relationship("AttendanceSession", back_populates="attendance_scans")
    qr_token = relationship("QRToken", back_populates="scans")
    student = relationship("User")
    attendance_record = relationship("AttendanceRecord", foreign_keys=[attendance_record_id])
