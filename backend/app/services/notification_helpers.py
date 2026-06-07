"""
Notification helper utilities.

Provides a single create_notification() function to avoid code duplication
across services that need to push in-app notifications to users.
"""
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    title: str,
    message: str,
    notification_type: str = "info",
) -> Notification:
    """
    Create and flush a Notification for the given user.

    The notification is flushed (written to the transaction) but NOT committed,
    so the caller controls when the full transaction is committed.

    Args:
        db: SQLAlchemy session
        user_id: UUID of the recipient user
        title: Short notification title (max 200 chars)
        message: Full notification body text
        notification_type: One of "info", "warning", "success", "reminder"

    Returns:
        The newly created Notification instance.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
    )
    db.add(notification)
    db.flush()
    return notification
