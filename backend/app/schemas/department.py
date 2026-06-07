from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=160)
    code: str | None = Field(None, max_length=40)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=160)
    code: str | None = Field(None, max_length=40)


class DepartmentPublic(DepartmentBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    student_count: int = 0
    lecturer_count: int = 0
    course_count: int = 0
    avg_attendance: float = 0.0

    model_config = ConfigDict(from_attributes=True)
