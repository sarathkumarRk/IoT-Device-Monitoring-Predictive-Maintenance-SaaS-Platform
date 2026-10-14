from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# Get Current User Notifications
@router.get("/", response_model=list[NotificationResponse])
def get_notifications(
    notification_type: str | None = Query(None),
    delivery_status: str | None = Query(None),
    is_read: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )

    if notification_type:
        query = query.filter(
            Notification.notification_type == notification_type.upper()
        )

    if delivery_status:
        query = query.filter(
            Notification.delivery_status == delivery_status.upper()
        )

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    return (
        query.order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


# Get Unread Notification Count
@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return {"unread_count": count}


# Mark One Notification as Read
@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if not notification.is_read:
        notification.is_read = True

        try:
            db.commit()
            db.refresh(notification)
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update notification",
            )

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
        "is_read": notification.is_read,
    }


# Mark All Current User Notifications as Read
@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated_count = (
            db.query(Notification)
            .filter(
                Notification.user_id == current_user.id,
                Notification.is_read.is_(False),
            )
            .update(
                {Notification.is_read: True},
                synchronize_session=False,
            )
        )

        db.commit()

        return {
            "message": "All notifications marked as read",
            "updated_count": updated_count,
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notifications",
        )


# Delete One Current User Notification
@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    try:
        db.delete(notification)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification",
        )

    return None

