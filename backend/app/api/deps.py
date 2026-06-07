from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        token_type = payload.get("token_type")
        if user_id is None or token_type != "access":
            raise credentials_error
    except JWTError as exc:
        raise credentials_error from exc

    user = db.get(User, UUID(user_id))
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_roles(*allowed_roles: UserRole):
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return role_dependency


require_student = require_roles(UserRole.student)
require_lecturer = require_roles(UserRole.lecturer)
require_admin = require_roles(UserRole.admin)
require_staff = require_roles(UserRole.staff)
require_admin_or_staff = require_roles(UserRole.admin, UserRole.staff)
