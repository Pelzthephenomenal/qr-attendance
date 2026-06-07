from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentPublic, DepartmentUpdate
from app.services import department_service

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("", response_model=DepartmentPublic, status_code=status.HTTP_201_CREATED)
def create_department(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    department_in: DepartmentCreate,
) -> DepartmentPublic:
    return department_service.create_department(db=db, obj_in=department_in, current_user=current_user)


@router.get("", response_model=list[DepartmentPublic])
def list_departments(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = 0,
    limit: int = 100,
) -> list[DepartmentPublic]:
    return department_service.list_departments(db=db, current_user=current_user, skip=skip, limit=limit)


@router.get("/{id}", response_model=DepartmentPublic)
def get_department(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
) -> DepartmentPublic:
    return department_service.get_department(db=db, id=id, current_user=current_user)


@router.patch("/{id}", response_model=DepartmentPublic)
def update_department(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
    department_in: DepartmentUpdate,
) -> DepartmentPublic:
    return department_service.update_department(db=db, id=id, obj_in=department_in, current_user=current_user)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    id: UUID,
) -> None:
    department_service.delete_department(db=db, id=id, current_user=current_user)
