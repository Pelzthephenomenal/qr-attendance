from uuid import UUID

from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.auth import UserPublic
from app.schemas.user import UserCreate, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    user_in: UserCreate,
) -> UserPublic:
    return user_service.create_user(db=db, obj_in=user_in, current_user=current_user)


@router.post("/bulk-import", response_model=dict, status_code=status.HTTP_201_CREATED)
def bulk_import_users(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    file: UploadFile = File(...),
) -> dict:
    return user_service.bulk_create_users(db=db, file=file, current_user=current_user)



@router.get("", response_model=list[UserPublic])
def list_users(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = 0,
    limit: int = 100,
) -> list[UserPublic]:
    return user_service.list_users(db=db, current_user=current_user, skip=skip, limit=limit)


@router.get("/{id}", response_model=UserPublic)
def get_user(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
) -> UserPublic:
    return user_service.get_user(db=db, id=id, current_user=current_user)


@router.patch("/{id}", response_model=UserPublic)
def update_user(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
    user_in: UserUpdate,
) -> UserPublic:
    return user_service.update_user(db=db, id=id, obj_in=user_in, current_user=current_user)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
) -> None:
    user_service.delete_user(db=db, id=id, current_user=current_user)
