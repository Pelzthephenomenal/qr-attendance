from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.notification import NotificationPublic
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationPublic])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationPublic]:
    return notification_service.list_my_notifications(db, current_user)


@router.patch("/{id}/read", response_model=NotificationPublic)
def mark_read(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPublic:
    return notification_service.mark_as_read(db=db, notification_id=id, current_user=current_user)


@router.post("/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    notification_service.mark_all_as_read(db=db, current_user=current_user)
