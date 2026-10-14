from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    device_id = Column(
        Integer, ForeignKey("devices.id"), nullable=True, index=True
    )
    sensor_type = Column(String(50), nullable=False)
    operator = Column(String(10), default=">")
    threshold = Column(Float, nullable=False)
    duration_seconds = Column(Integer, default=0)
    severity = Column(String(20), default="MEDIUM", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    device = relationship("Device", back_populates="alert_rules")
    alerts = relationship("Alert", back_populates="rule")