from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    delivery_status: str
    delivery_error: str | None
    sent_at: datetime | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)