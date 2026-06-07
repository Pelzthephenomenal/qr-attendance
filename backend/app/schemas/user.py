from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: UserRole
    department_id: UUID | None = None
    matric_no: str | None = Field(default=None, max_length=80)
    staff_no: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=40)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    role: UserRole | None = None
    department_id: UUID | None = None
    matric_no: str | None = Field(default=None, max_length=80)
    staff_no: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=40)
    is_active: bool | None = None
