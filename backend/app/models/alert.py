from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(
        Integer, ForeignKey("devices.id"), index=True, nullable=False
    )
    rule_id = Column(Integer, ForeignKey("alert_rules.id"), nullable=False)
    severity = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="OPEN", nullable=False)
    triggered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    device = relationship("Device", back_populates="alerts")
    rule = relationship("AlertRule", back_populates="alerts")
    history = relationship("AlertHistory", back_populates="alert")