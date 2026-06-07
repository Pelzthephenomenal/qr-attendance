from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import AttendanceStatus, ScanResult


class AttendanceScanRequest(BaseModel):
    payload: str = Field(min_length=1)
    latitude: float | None = None
    longitude: float | None = None
    device_fingerprint: str | None = Field(default=None, max_length=255)


class AttendanceScanResponse(BaseModel):
    result: ScanResult
    status: AttendanceStatus | None = None
    message: str
    session_id: UUID | None = None
    attendance_record_id: UUID | None = None


class CourseNested(BaseModel):
    id: UUID
    code: str
    title: str

class SessionNested(BaseModel):
    id: UUID
    course: CourseNested | None = None

class AttendanceRecordPublic(BaseModel):
    id: UUID
    session_id: UUID
    student_id: UUID
    status: AttendanceStatus
    marked_at: datetime | None
    marked_by: UUID | None
    scan_id: UUID | None
    minutes_late: int | None
    is_manual: bool
    note: str | None
    session: SessionNested | None = None

    model_config = {"from_attributes": True}


class ManualAttendanceRequest(BaseModel):
    student_id: UUID
    status: AttendanceStatus
    note: str = Field(min_length=1, max_length=500)

