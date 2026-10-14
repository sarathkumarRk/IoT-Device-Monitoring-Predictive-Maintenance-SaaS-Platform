from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(100), unique=True, nullable=False)
    device_id = Column(
        Integer, ForeignKey("devices.id"), index=True, nullable=False
    )
    timestamp = Column(DateTime(timezone=True), index=True, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    battery_level = Column(Float, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    device = relationship("Device", back_populates="readings")