from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.session import (
    CurrentQRResponse,
    QRTokenPublic,
    SessionCreateRequest,
    SessionPublic,
    SessionStartResponse,
)
from app.services.session_service import (
    close_session,
    create_course_session,
    get_current_qr_token,
    rotate_qr_token,
    start_session,
)


router = APIRouter()
require_session_manager = require_roles(UserRole.lecturer, UserRole.admin)


@router.post("/courses/{course_id}/sessions", response_model=SessionPublic, status_code=status.HTTP_201_CREATED)
def create_session(
    course_id: UUID,
    payload: SessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_session_manager),
) -> SessionPublic:
    return create_course_session(db, course_id=course_id, payload=payload, current_user=current_user)


@router.post("/sessions/{session_id}/start", response_model=SessionStartResponse)
def start(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_session_manager),
) -> SessionStartResponse:
    session, token = start_session(db, session_id=session_id, current_user=current_user)
    return SessionStartResponse(session=session, qr=token)


@router.post("/sessions/{session_id}/close", response_model=SessionPublic)
def close(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_session_manager),
) -> SessionPublic:
    return close_session(db, session_id=session_id, current_user=current_user)


@router.get("/sessions/{session_id}/qr/current", response_model=CurrentQRResponse)
def current_qr(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_session_manager),
) -> CurrentQRResponse:
    return get_current_qr_token(db, session_id=session_id, current_user=current_user)


@router.post("/sessions/{session_id}/qr/rotate", response_model=QRTokenPublic)
def rotate_qr(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_session_manager),
) -> QRTokenPublic:
    return rotate_qr_token(db, session_id=session_id, current_user=current_user)
