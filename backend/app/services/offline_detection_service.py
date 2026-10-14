import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.device import Device
from app.services.websocket_service import websocket_manager

logger = logging.getLogger(__name__)


async def broadcast_offline_status(device: Device) -> None:
    try:
        await websocket_manager.broadcast(
            {
                "type": "device_status_updated",
                "device_id": device.id,
                "device_code": device.device_code,
                "name": device.name,
                "status": device.status,
                "is_active": device.is_active,
                "lifecycle_status": device.lifecycle_status,
                "last_seen": (
                    device.last_seen.isoformat()
                    if device.last_seen
                    else None
                ),
            }
        )
    except Exception:
        logger.exception(
            "Failed to broadcast offline status for device %s",
            device.id,
        )


async def check_offline_devices() -> int:
    """
    Mark active devices OFFLINE when their last reading is stale.

    A device is considered stale when no reading arrives within
    reporting_interval * SENSOR_STALE_MULTIPLIER seconds.

    Returns the number of devices newly marked OFFLINE.
    """
    db: Session = SessionLocal()
    changed_devices = []

    try:
        now = datetime.now(timezone.utc)

        stale_multiplier = max(
            getattr(settings, "SENSOR_STALE_MULTIPLIER", 3),
            1,
        )

        # Only active, non-retired devices should be monitored.
        devices = (
            db.query(Device)
            .filter(
                Device.is_active == "ACTIVE",
                Device.lifecycle_status == "ACTIVE",
            )
            .all()
        )

        for device in devices:
            interval = max(device.reporting_interval or 60, 1)

            stale_after = timedelta(
                seconds=interval * stale_multiplier
            )

            last_seen = device.last_seen

            # A device that has never sent a reading is offline.
            if last_seen is None:
                should_be_offline = True
            else:
                # Handle databases returning naive datetimes.
                if last_seen.tzinfo is None:
                    last_seen = last_seen.replace(
                        tzinfo=timezone.utc
                    )

                should_be_offline = (
                    now - last_seen > stale_after
                )

            if should_be_offline and device.status != "OFFLINE":
                device.status = "OFFLINE"
                changed_devices.append(device)

        if changed_devices:
            db.commit()

            for device in changed_devices:
                db.refresh(device)

    except Exception:
        db.rollback()
        logger.exception("Offline device detection failed")
        raise

    finally:
        db.close()

    # Broadcast after the database session is closed.
    for device in changed_devices:
        await broadcast_offline_status(device)

    logger.info(
        "Offline detection completed; %s device(s) changed to OFFLINE",
        len(changed_devices),
    )

    return len(changed_devices)
