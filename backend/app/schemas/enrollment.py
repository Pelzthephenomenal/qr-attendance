from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EnrollmentCreate(BaseModel):
    student_id: UUID


class EnrollmentPublic(BaseModel):
    id: UUID
    course_id: UUID
    student_id: UUID
    enrolled_at: datetime
    dropped_at: datetime | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
