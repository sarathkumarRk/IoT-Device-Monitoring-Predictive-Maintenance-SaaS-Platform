from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default="VIEWER", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    sites = relationship("Site", back_populates="created_by_user")
    maintenance_tasks = relationship(
        "MaintenanceTask",
        back_populates="assigned_user",
        foreign_keys="MaintenanceTask.assigned_to",
    )
    maintenance_logs = relationship("MaintenanceLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    alert_history = relationship("AlertHistory", back_populates="user")