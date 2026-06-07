from datetime import datetime, timedelta, timezone
import hashlib

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


def register_user(db: Session, payload: RegisterRequest) -> TokenResponse:
    organization = _get_or_create_organization(db, payload)

    existing_user = db.scalar(
        select(User).where(
            User.organization_id == organization.id,
            User.email == payload.email.lower(),
        )
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists in this organization.",
        )

    user = User(
        organization_id=organization.id,
        department_id=payload.department_id,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        role=payload.role,
        matric_no=payload.matric_no,
        staff_no=payload.staff_no,
        phone=payload.phone,
        is_active=True,
        is_verified=False,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration conflicts with an existing record.",
        ) from exc

    db.refresh(user)
    return _token_response(db, user)


def login_user(db: Session, payload: LoginRequest) -> TokenResponse:
    query = select(User).where(User.email == payload.email.lower())
    if payload.organization_id is not None:
        query = query.where(User.organization_id == payload.organization_id)

    user = db.scalar(query)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return _token_response(db, user)


def _get_or_create_organization(db: Session, payload: RegisterRequest) -> Organization:
    if payload.organization_id is not None:
        organization = db.get(Organization, payload.organization_id)
        if organization is None or not organization.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )
        return organization

    organization = db.scalar(select(Organization).where(Organization.slug == payload.organization_slug))
    if organization is not None:
        return organization

    organization = Organization(
        name=payload.organization_name or payload.organization_slug or "Organization",
        slug=payload.organization_slug or "",
    )
    db.add(organization)
    db.flush()
    return organization


def _token_response(db: Session, user: User) -> TokenResponse:
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        organization_id=str(user.organization_id),
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Save refresh token hash to database
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_expire_minutes)
    
    refresh_token_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(refresh_token_record)
    db.commit()
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


def verify_refresh_token(db: Session, refresh_token: str) -> User:
    """Verify refresh token and return associated user."""
    from jose import jwt, JWTError
    
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        import uuid
        user_id_str = payload.get("sub")
        user_id = uuid.UUID(user_id_str) if user_id_str else None
        token_type = payload.get("token_type")
        
        if user_id is None or token_type != "refresh":
            raise credentials_error
    except JWTError as exc:
        raise credentials_error from exc
    
    # Check if token is in database and not revoked
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    token_record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    
    if token_record is None:
        raise credentials_error
    
    # Get user
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    
    return user


def refresh_user_token(db: Session, old_refresh_token: str) -> TokenResponse:
    """Generate new tokens using refresh token (token rotation)."""
    user = verify_refresh_token(db, old_refresh_token)
    
    # Mark old refresh token as replaced
    old_token_hash = hashlib.sha256(old_refresh_token.encode()).hexdigest()
    old_token_record = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == old_token_hash)
    )
    
    # Create new tokens
    new_response = _token_response(db, user)
    
    # Mark old token as replaced by new one
    if old_token_record:
        new_token_record = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hashlib.sha256(new_response.refresh_token.encode()).hexdigest()
            )
        )
        old_token_record.replaced_by_token_id = new_token_record.id
        db.commit()
    
    return new_response


def logout_user(db: Session, refresh_token: str | None = None) -> None:
    """Revoke refresh token on logout."""
    if refresh_token is None:
        return
    
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    token_record = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    
    if token_record:
        token_record.revoked_at = datetime.now(timezone.utc)
        db.commit()

