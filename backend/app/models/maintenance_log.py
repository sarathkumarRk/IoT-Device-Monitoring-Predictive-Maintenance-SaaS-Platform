from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.database import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(
        Integer, ForeignKey("maintenance_tasks.id"), index=True, nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    task = relationship("MaintenanceTask", back_populates="logs")
    user = relationship("User", back_populates="maintenance_logs")