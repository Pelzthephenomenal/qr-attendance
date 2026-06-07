from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import UserRole


class UserPublic(BaseModel):
    id: UUID
    organization_id: UUID
    department_id: UUID | None = None
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    matric_no: str | None = None
    staff_no: str | None = None
    phone: str | None = None
    is_active: bool
    is_verified: bool

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: UserRole
    organization_id: UUID | None = None
    organization_name: str | None = Field(default=None, max_length=200)
    organization_slug: str | None = Field(default=None, max_length=80)
    department_id: UUID | None = None
    matric_no: str | None = Field(default=None, max_length=80)
    staff_no: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=40)

    @model_validator(mode="after")
    def validate_role_identifiers(self) -> "RegisterRequest":
        if self.organization_id is None and not (self.organization_name and self.organization_slug):
            raise ValueError(
                "Provide organization_id, or provide organization_name and organization_slug to create one."
            )
        if self.role == UserRole.student and not self.matric_no:
            raise ValueError("matric_no is required for student registration.")
        if self.role in {UserRole.lecturer, UserRole.admin, UserRole.staff} and not self.staff_no:
            raise ValueError("staff_no is required for lecturer, admin, and staff registration.")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    organization_id: UUID | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class RefreshTokenRequest(BaseModel):
    refresh_token: str

