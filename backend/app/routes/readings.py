import logging
from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alert_rule import AlertRule
from app.models.alert import Alert
from app.models.alert_history import AlertHistory
from app.models.notification import Notification
from app.models.user import User
from app.schemas.sensor_reading import (
    SensorReadingCreate,
    SensorReadingResponse,
)
from app.services.websocket_service import websocket_manager
from app.services.email_service import send_critical_alert_email


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/devices", tags=["Sensor Readings"])

ALLOWED_ROLES = {"ADMIN", "OPERATOR", "VIEWER"}
INGESTION_ROLES = {"ADMIN", "OPERATOR"}

SENSOR_FIELDS = {
    "temperature": "temperature",
    "humidity": "humidity",
    "vibration": "vibration",
    "battery_level": "battery_level",
}

# HELPERS

def ensure_valid_role(user: User) -> str:
    role = (user.role or "").upper()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )

    return role


def validate_reading(reading_data: SensorReadingCreate) -> None:
    if not reading_data.event_id.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Event ID cannot be empty",
        )

    if not 0 <= reading_data.humidity <= 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Humidity must be between 0 and 100",
        )

    if not 0 <= reading_data.battery_level <= 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Battery level must be between 0 and 100",
        )

    if not -100 <= reading_data.temperature <= 200:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Temperature is outside the accepted range",
        )

    if reading_data.vibration < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vibration cannot be negative",
        )

    if reading_data.timestamp.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Timestamp must include a timezone",
        )

    if reading_data.timestamp.utcoffset() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Timestamp must include a valid timezone",
        )

    if reading_data.timestamp > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reading timestamp cannot be in the future",
        )


def rule_matches(value: float, operator: str, threshold: float) -> bool:
    if operator == ">":
        return value > threshold
    if operator == ">=":
        return value >= threshold
    if operator == "<":
        return value < threshold
    if operator == "<=":
        return value <= threshold
    if operator == "==":
        return value == threshold

    return False

def evaluate_rule_duration(
    db: Session,
    device_id: int,
    reading: SensorReading,
    rule: AlertRule,
) -> bool:
    """Check whether a sensor rule remains true for its required duration."""

    field = SENSOR_FIELDS.get(rule.sensor_type)

    if field is None:
        return False

    if not rule_matches(
        getattr(reading, field),
        rule.operator,
        rule.threshold,
    ):
        return False

    if rule.duration_seconds <= 0:
        return True

    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if device is None:
        return False

    def to_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc)

    reading_time = to_utc(reading.timestamp)

    cutoff = reading_time - timedelta(
        seconds=rule.duration_seconds
    )

    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.device_id == device_id,
            SensorReading.timestamp >= cutoff.replace(tzinfo=None),
            SensorReading.timestamp <= reading_time.replace(tzinfo=None),
        )
        .order_by(
            SensorReading.timestamp.desc(),
            SensorReading.id.desc(),
        )
        .all()
    )

    if not readings:
        return False

    # Keep only readings that match the rule condition.
    for item in readings:
        if not rule_matches(
            getattr(item, field),
            rule.operator,
            rule.threshold,
        ):
            return False

    chronological = sorted(
        readings,
        key=lambda item: (
            to_utc(item.timestamp),
            item.id,
        ),
    )

    oldest_time = to_utc(chronological[0].timestamp)
    latest_time = to_utc(chronological[-1].timestamp)

    tolerance = max(device.reporting_interval or 60, 1)

    # Required duration must be covered by readings.
    if (oldest_time - cutoff).total_seconds() > tolerance:
        return False

    # Avoid treating a long gap between readings as continuous.
    for previous, current in zip(
        chronological,
        chronological[1:],
    ):
        gap = (
            to_utc(current.timestamp)
            - to_utc(previous.timestamp)
        ).total_seconds()

        if gap > tolerance * 2:
            return False

    return (
        latest_time >= reading_time
        and (latest_time - oldest_time).total_seconds()
        >= rule.duration_seconds
    )


async def broadcast_event(payload: dict) -> None:
    """WebSocket failure must not interrupt ingestion."""

    try:
        await websocket_manager.broadcast(payload)
    except Exception:
        logger.exception("WebSocket broadcast failed")


# ALERT RULE EVALUATION
def evaluate_alert_rules(
    db: Session,
    device: Device,
    reading: SensorReading,
    actor: User,
) -> list[Alert]:
    rules = (
        db.query(AlertRule)
        .filter(
            AlertRule.is_active.is_(True),
            or_(
                AlertRule.device_id == device.id,
                AlertRule.device_id.is_(None),
            ),
        )
        .all()
    )

    created_alerts = []

    for rule in rules:
        if not evaluate_rule_duration(
            db=db,
            device_id=device.id,
            reading=reading,
            rule=rule,
        ):
            continue

        existing_alert = (
            db.query(Alert)
            .filter(
                Alert.device_id == device.id,
                Alert.rule_id == rule.id,
                Alert.status.in_(["OPEN", "ACKNOWLEDGED"]),
            )
            .first()
        )

        if existing_alert:
            continue

        field = SENSOR_FIELDS.get(rule.sensor_type)

        if field is None:
            continue

        value = getattr(reading, field)

        alert = Alert(
            device_id=device.id,
            rule_id=rule.id,
            severity=rule.severity,
            message=(
                f"{rule.name}: {rule.sensor_type} value {value} "
                f"matched condition {rule.operator} {rule.threshold}"
            ),
            status="OPEN",
            triggered_at=datetime.now(timezone.utc),
        )

        db.add(alert)
        db.flush()

        db.add(
            AlertHistory(
                alert_id=alert.id,
                user_id=actor.id,
                previous_status=None,
                new_status="OPEN",
                notes="Alert automatically generated from sensor reading",
            )
        )

        created_alerts.append(alert)

        if rule.severity == "CRITICAL":
            device.status = "CRITICAL"
        elif device.status != "CRITICAL":
            device.status = "WARNING"

    return created_alerts


# NOTIFICATIONS
def create_alert_notifications(
    db: Session,
    alerts: list[Alert],
) -> list[tuple[Notification, str]]:
    email_jobs = []

    if not alerts:
        return email_jobs

    recipients = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.role.in_(["ADMIN", "OPERATOR"]),
        )
        .all()
    )

    for alert in alerts:
        for recipient in recipients:
            notification = Notification(
                user_id=recipient.id,
                title=f"{alert.severity} device alert",
                message=alert.message,
                notification_type=(
                    "CRITICAL_ALERT"
                    if alert.severity == "CRITICAL"
                    else "DEVICE_ALERT"
                ),
                delivery_status="PENDING",
                is_read=False,
            )

            db.add(notification)
            db.flush()

            if alert.severity == "CRITICAL" and recipient.email:
                email_jobs.append((notification, recipient.email))
            else:
                notification.delivery_status = "IN_APP"

    return email_jobs


async def deliver_critical_emails(
    db: Session,
    email_jobs: list[tuple[Notification, str]],
    device_name: str,
) -> None:
    for notification, recipient_email in email_jobs:
        try:
            sent = await send_critical_alert_email(
                recipient=recipient_email,
                device_name=device_name,
                alert_message=notification.message,
            )

            notification.delivery_status = (
                "SENT" if sent else "FAILED"
            )
            notification.delivery_error = (
                None if sent else "SMTP delivery failed"
            )

            if sent:
                notification.sent_at = datetime.now(timezone.utc)

            db.commit()

        except Exception:
            db.rollback()
            logger.exception(
                "Failed to deliver critical alert notification %s",
                notification.id,
            )


from datetime import timezone

# CREATE SENSOR READING
# ADMIN / OPERATOR ONLY
@router.post(
    "/{device_id}/readings",
    response_model=SensorReadingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reading(
    device_id: int,
    reading_data: SensorReadingCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = ensure_valid_role(current_user)

    if role not in INGESTION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Operator access required to submit sensor readings",
        )

    validate_reading(reading_data)

    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    if (
        device.is_active != "ACTIVE"
        or device.lifecycle_status != "ACTIVE"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot accept readings from an inactive or retired device",
        )

    # Normalize incoming timestamp to UTC.
    reading_timestamp = reading_data.timestamp

    if reading_timestamp.tzinfo is None:
        reading_timestamp = reading_timestamp.replace(
            tzinfo=timezone.utc
        )
    else:
        reading_timestamp = reading_timestamp.astimezone(
            timezone.utc
        )

    # Idempotency: return existing reading for duplicate event ID.
    existing = (
        db.query(SensorReading)
        .filter(
            SensorReading.event_id == reading_data.event_id
        )
        .first()
    )

    if existing:
        if existing.device_id != device.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This event ID is already associated with another device",
            )

        response.status_code = status.HTTP_200_OK
        return existing

    reading = SensorReading(
        event_id=reading_data.event_id,
        device_id=device.id,
        timestamp=reading_timestamp,
        temperature=reading_data.temperature,
        humidity=reading_data.humidity,
        vibration=reading_data.vibration,
        battery_level=reading_data.battery_level,
    )

    current_status = "ONLINE"

    if (
        reading_data.temperature < device.temperature_min
        or reading_data.temperature > device.temperature_max
        or reading_data.humidity < device.humidity_min
        or reading_data.humidity > device.humidity_max
        or reading_data.vibration > device.vibration_max
        or reading_data.battery_level < 10
    ):
        current_status = "WARNING"

    # Normalize device.last_seen before comparing timestamps.
    latest_timestamp = device.last_seen

    if latest_timestamp is not None:
        if latest_timestamp.tzinfo is None:
            latest_timestamp = latest_timestamp.replace(
                tzinfo=timezone.utc
            )
        else:
            latest_timestamp = latest_timestamp.astimezone(
                timezone.utc
            )

    if (
        latest_timestamp is None
        or reading_timestamp > latest_timestamp
    ):
        device.last_seen = reading_timestamp
        device.status = current_status

    try:
        db.add(reading)
        db.flush()

        alerts = evaluate_alert_rules(
            db=db,
            device=device,
            reading=reading,
            actor=current_user,
        )

        email_jobs = create_alert_notifications(
            db,
            alerts,
        )

        db.commit()
        db.refresh(reading)
        db.refresh(device)

        for alert in alerts:
            db.refresh(alert)

    except IntegrityError:
        db.rollback()

        existing = (
            db.query(SensorReading)
            .filter(
                SensorReading.event_id == reading_data.event_id
            )
            .first()
        )

        if existing and existing.device_id == device.id:
            response.status_code = status.HTTP_200_OK
            return existing

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate event ID or conflicting sensor reading",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to save sensor reading")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save sensor reading or evaluate alert rules",
        )

    if email_jobs:
        await deliver_critical_emails(
            db=db,
            email_jobs=email_jobs,
            device_name=device.name,
        )

    await broadcast_event(
        {
            "type": "new_reading",
            "device_id": device.id,
            "device_code": device.device_code,
            "event_id": reading.event_id,
            "temperature": reading.temperature,
            "humidity": reading.humidity,
            "vibration": reading.vibration,
            "battery_level": reading.battery_level,
            "timestamp": reading.timestamp.isoformat(),
            "device_status": device.status,
        }
    )

    for alert in alerts:
        await broadcast_event(
            {
                "type": "new_alert",
                "alert_id": alert.id,
                "device_id": alert.device_id,
                "rule_id": alert.rule_id,
                "severity": alert.severity,
                "message": alert.message,
                "status": alert.status,
            }
        )

    return reading

# GET SENSOR READINGS
# ADMIN / OPERATOR / VIEWER
@router.get(
    "/{device_id}/readings",
    response_model=list[SensorReadingResponse],
)
def get_readings(
    device_id: int,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    device = (
        db.query(Device)
        .filter(Device.id == device_id)
        .first()
    )

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    if from_date and from_date.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'from' must include a timezone",
        )

    if to_date and to_date.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'to' must include a timezone",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' date cannot be later than 'to' date",
        )

    query = db.query(SensorReading).filter(
        SensorReading.device_id == device_id
    )

    if from_date is not None:
        query = query.filter(
            SensorReading.timestamp >= from_date
        )

    if to_date is not None:
        query = query.filter(
            SensorReading.timestamp <= to_date
        )

    return (
        query.order_by(
            SensorReading.timestamp.desc(),
            SensorReading.id.desc(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )





