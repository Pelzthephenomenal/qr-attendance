from datetime import time
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CourseScheduleBase(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time
    room: str | None = None


class CourseScheduleCreate(CourseScheduleBase):
    pass


class CourseScheduleUpdate(BaseModel):
    day_of_week: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = None


class CourseSchedulePublic(CourseScheduleBase):
    id: UUID
    course_id: UUID

    model_config = ConfigDict(from_attributes=True)
