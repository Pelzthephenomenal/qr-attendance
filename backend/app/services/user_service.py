from datetime import datetime, timezone
from uuid import UUID

import csv
import io
from fastapi import HTTPException, status, UploadFile
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_user(db: Session, *, obj_in: UserCreate, current_user: User) -> User:
    db_obj = User(
        organization_id=current_user.organization_id,
        department_id=obj_in.department_id,
        email=obj_in.email,
        password_hash=pwd_context.hash(obj_in.password),
        first_name=obj_in.first_name,
        last_name=obj_in.last_name,
        role=obj_in.role,
        matric_no=obj_in.matric_no,
        staff_no=obj_in.staff_no,
        phone=obj_in.phone,
        is_active=True,
    )
    db.add(db_obj)
    try:
        db.commit()
        db.refresh(db_obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email, matric_no or staff_no already exists.",
        )
    return db_obj


def get_user(db: Session, *, id: UUID, current_user: User) -> User:
    user = db.get(User, id)
    if not user or user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def list_users(db: Session, *, current_user: User, skip: int = 0, limit: int = 100) -> list[User]:
    return list(db.scalars(
        select(User)
        .where(User.organization_id == current_user.organization_id)
        .order_by(User.first_name, User.last_name)
        .offset(skip)
        .limit(limit)
    ).all())


def update_user(db: Session, *, id: UUID, obj_in: UserUpdate, current_user: User) -> User:
    user = get_user(db, id=id, current_user=current_user)
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
        
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email, matric_no or staff_no already exists.",
        )
    return user


def delete_user(db: Session, *, id: UUID, current_user: User) -> None:
    user = get_user(db, id=id, current_user=current_user)
    user.is_active = False
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()


def bulk_create_users(db: Session, *, file: UploadFile, current_user: User) -> dict:
    contents = file.file.read().decode("utf-8")
    csv_reader = csv.DictReader(io.StringIO(contents))
    
    users_to_add = []
    errors = []
    row_num = 1
    
    for row in csv_reader:
        row_num += 1
        try:
            db_obj = User(
                organization_id=current_user.organization_id,
                department_id=None, # For simplicity, unless we look up dept by name
                email=row.get("email", "").strip(),
                password_hash=pwd_context.hash("Default123!"), # Default password for bulk import
                first_name=row.get("first_name", "").strip(),
                last_name=row.get("last_name", "").strip(),
                role=row.get("role", "student").strip(),
                matric_no=row.get("matric_no", "").strip() or None,
                staff_no=row.get("staff_no", "").strip() or None,
                phone=row.get("phone", "").strip() or None,
                is_active=True,
            )
            users_to_add.append(db_obj)
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            
    if users_to_add:
        db.add_all(users_to_add)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bulk import failed due to duplicate email, matric_no or staff_no.",
            )
            
    return {"imported": len(users_to_add), "errors": errors}

