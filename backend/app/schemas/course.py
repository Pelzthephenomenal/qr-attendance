from uuid import UUID

from pydantic import BaseModel, Field


class CourseBase(BaseModel):
    department_id: UUID | None = None
    code: str = Field(..., max_length=60)
    title: str = Field(..., max_length=220)
    description: str | None = Field(None, max_length=1000)
    academic_year: str | None = Field(None, max_length=20)
    term: str | None = Field(None, max_length=40)
    level: str | None = Field(None, max_length=40)
    is_active: bool = True


class CourseCreate(CourseBase):
    instructor_ids: list[UUID] | None = None


class CourseUpdate(BaseModel):
    department_id: UUID | None = None
    code: str | None = Field(None, max_length=60)
    title: str | None = Field(None, max_length=220)
    description: str | None = Field(None, max_length=1000)
    academic_year: str | None = Field(None, max_length=20)
    term: str | None = Field(None, max_length=40)
    level: str | None = Field(None, max_length=40)
    is_active: bool | None = None
    instructor_ids: list[UUID] | None = None


class CoursePublic(BaseModel):
    id: UUID
    organization_id: UUID
    department_id: UUID | None
    code: str
    title: str
    description: str | None
    academic_year: str | None
    term: str | None
    level: str | None
    is_active: bool
    student_count: int = 0
    instructor_ids: list[UUID] = Field(default_factory=list)

    model_config = {"from_attributes": True}

