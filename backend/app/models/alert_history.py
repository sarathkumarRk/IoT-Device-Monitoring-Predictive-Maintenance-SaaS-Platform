from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(
        Integer, ForeignKey("alerts.id"), index=True, nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    changed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    alert = relationship("Alert", back_populates="history")
    user = relationship("User", back_populates="alert_history")