from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import SessionStatus


class SessionCreateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=220)
    starts_at: datetime
    ends_at: datetime
    late_after_minutes: int = Field(default=15, ge=0)
    qr_rotation_seconds: int = Field(default=30, ge=10, le=3600)
    location_name: str | None = Field(default=None, max_length=180)
    latitude: float | None = None
    longitude: float | None = None
    allowed_radius_meters: int | None = Field(default=None, ge=0)
    require_location: bool = False
    require_device_check: bool = False
    notes: str | None = Field(default=None, max_length=1000)


class SessionPublic(BaseModel):
    id: UUID
    course_id: UUID
    created_by: UUID
    title: str | None
    status: SessionStatus
    session_date: datetime
    starts_at: datetime
    ends_at: datetime
    late_after_minutes: int
    qr_rotation_seconds: int
    location_name: str | None
    require_location: bool
    require_device_check: bool
    started_at: datetime | None
    closed_at: datetime | None

    model_config = {"from_attributes": True}


class QRTokenPublic(BaseModel):
    session_id: UUID
    token_id: UUID
    payload: str
    issued_at: datetime
    expires_at: datetime


class CurrentQRResponse(BaseModel):
    session_id: UUID
    token_id: UUID | None = None
    payload: str | None = None
    expires_at: datetime | None = None
    needs_rotation: bool = False


class SessionStartResponse(BaseModel):
    session: SessionPublic
    qr: QRTokenPublic
