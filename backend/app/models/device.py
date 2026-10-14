from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    __table_args__ = (
        CheckConstraint(
            "status IN ('ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL')",
            name="ck_devices_status",
        ),
        CheckConstraint(
            "is_active IN ('ACTIVE', 'INACTIVE')",
            name="ck_devices_is_active",
        ),
        CheckConstraint(
            "lifecycle_status IN ('ACTIVE', 'INACTIVE', 'RETIRED')",
            name="ck_devices_lifecycle_status",
        ),
        CheckConstraint(
            "temperature_min < temperature_max",
            name="ck_devices_temperature_range",
        ),
        CheckConstraint(
            "humidity_min < humidity_max",
            name="ck_devices_humidity_range",
        ),
        CheckConstraint(
            "vibration_max > 0",
            name="ck_devices_vibration_max",
        ),
        CheckConstraint(
            "reporting_interval > 0",
            name="ck_devices_reporting_interval",
        ),
    )

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Device identification
    device_code = Column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    name = Column(String(150), nullable=False)
    device_type = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)

    # Site / facility assignment
    site_id = Column(
        Integer,
        ForeignKey("sites.id"),
        nullable=False,
        index=True,
    )
    installation_date = Column(Date, nullable=True)

    # Monitoring status
    status = Column(
        String(20),
        default="OFFLINE",
        nullable=False,
        index=True,
    )

    # Operational flag retained for existing route compatibility
    is_active = Column(
        String(20),
        default="ACTIVE",
        nullable=False,
    )

    # Lifecycle: ACTIVE, INACTIVE, RETIRED
    lifecycle_status = Column(
        String(20),
        default="ACTIVE",
        nullable=False,
        index=True,
    )

    # Expected sensor ranges
    temperature_min = Column(Float, default=0, nullable=False)
    temperature_max = Column(Float, default=80, nullable=False)
    humidity_min = Column(Float, default=0, nullable=False)
    humidity_max = Column(Float, default=100, nullable=False)
    vibration_max = Column(Float, default=5, nullable=False)

    # Expected sensor reporting interval, in seconds
    reporting_interval = Column(
        Integer,
        default=60,
        nullable=False,
    )

    # Last successful reading timestamp
    last_seen = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Cloudinary uploaded document URL
    document_url = Column(String(500), nullable=True)

    # Record creation timestamp
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    site = relationship(
        "Site",
        back_populates="devices",
    )

    readings = relationship(
        "SensorReading",
        back_populates="device",
    )

    alerts = relationship(
        "Alert",
        back_populates="device",
    )

    maintenance_tasks = relationship(
        "MaintenanceTask",
        back_populates="device",
    )

    alert_rules = relationship(
        "AlertRule",
        back_populates="device",
    )

