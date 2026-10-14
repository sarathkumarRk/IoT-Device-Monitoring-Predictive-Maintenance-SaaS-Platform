from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(
        Integer, ForeignKey("devices.id"), index=True, nullable=False
    )
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="MEDIUM", nullable=False)
    status = Column(String(20), default="OPEN", nullable=False)
    due_date = Column(Date, nullable=True)
    completion_details = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    device = relationship("Device", back_populates="maintenance_tasks")
    assigned_user = relationship(
        "User",
        back_populates="maintenance_tasks",
        foreign_keys=[assigned_to],
    )
    logs = relationship("MaintenanceLog", back_populates="task")