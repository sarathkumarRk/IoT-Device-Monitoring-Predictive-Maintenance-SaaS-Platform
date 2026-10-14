import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, admin_required
from app.models.alert_rule import AlertRule
from app.models.device import Device
from app.models.user import User
from app.schemas.alert_rule import (
    AlertRuleCreate,
    AlertRuleResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/alert-rules",
    tags=["Alert Rules"],
)

ALLOWED_ROLES = {"ADMIN", "OPERATOR", "VIEWER"}

ALLOWED_SENSOR_TYPES = {
    "temperature",
    "humidity",
    "vibration",
    "battery_level",
}

ALLOWED_OPERATORS = {">", ">=", "<", "<=", "=="}

ALLOWED_SEVERITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
}


# HELPERS
def ensure_valid_role(user: User) -> None:
    role = (user.role or "").upper()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )


def get_rule_or_404(db: Session, rule_id: int) -> AlertRule:
    rule = (
        db.query(AlertRule)
        .filter(AlertRule.id == rule_id)
        .first()
    )

    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert rule not found",
        )

    return rule


def get_active_device_or_400(
    db: Session,
    device_id: int,
) -> Device:
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
        or getattr(device, "lifecycle_status", "ACTIVE") != "ACTIVE"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The device is inactive or retired",
        )

    return device


def find_duplicate_active_rule(
    db: Session,
    name: str,
    device_id: int | None,
    sensor_type: str,
    operator: str,
    threshold: float,
    duration_seconds: int,
) -> AlertRule | None:
    query = db.query(AlertRule).filter(
        AlertRule.name == name,
        AlertRule.sensor_type == sensor_type,
        AlertRule.operator == operator,
        AlertRule.threshold == threshold,
        AlertRule.duration_seconds == duration_seconds,
        AlertRule.is_active.is_(True),
    )

    if device_id is None:
        query = query.filter(AlertRule.device_id.is_(None))
    else:
        query = query.filter(AlertRule.device_id == device_id)

    return query.first()



# CREATE ALERT RULE - ADMIN ONLY
@router.post(
    "/",
    response_model=AlertRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_alert_rule(
    rule_data: AlertRuleCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    name = rule_data.name.strip()
    sensor_type = rule_data.sensor_type.strip().lower()
    operator = rule_data.operator.strip()
    severity = rule_data.severity.strip().upper()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Alert rule name cannot be empty",
        )

    if sensor_type not in ALLOWED_SENSOR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Invalid sensor type. Use temperature, humidity, "
                "vibration, or battery_level"
            ),
        )

    if operator not in ALLOWED_OPERATORS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid operator",
        )

    if severity not in ALLOWED_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid alert severity",
        )

    if rule_data.threshold < 0 and sensor_type in {
        "humidity",
        "vibration",
        "battery_level",
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Threshold cannot be negative for {sensor_type}",
        )

    if sensor_type == "humidity" and rule_data.threshold > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Humidity threshold must not exceed 100",
        )

    if sensor_type == "battery_level" and rule_data.threshold > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Battery threshold must not exceed 100",
        )

    if rule_data.duration_seconds < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duration cannot be negative",
        )

    if rule_data.device_id is not None:
        get_active_device_or_400(db, rule_data.device_id)

    duplicate = find_duplicate_active_rule(
        db=db,
        name=name,
        device_id=rule_data.device_id,
        sensor_type=sensor_type,
        operator=operator,
        threshold=rule_data.threshold,
        duration_seconds=rule_data.duration_seconds,
    )

    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An identical active alert rule already exists",
        )

    rule = AlertRule(
        name=name,
        device_id=rule_data.device_id,
        sensor_type=sensor_type,
        operator=operator,
        threshold=rule_data.threshold,
        duration_seconds=rule_data.duration_seconds,
        severity=severity,
        is_active=True,
    )

    try:
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    except IntegrityError:
        db.rollback()
        logger.exception("Alert rule integrity error")

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alert rule conflicts with existing data",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to create alert rule")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert rule",
        )


# LIST ALERT RULES - AUTHENTICATED USERS
@router.get(
    "/",
    response_model=list[AlertRuleResponse],
)
def get_alert_rules(
    device_id: int | None = Query(None, ge=1),
    sensor_type: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    query = db.query(AlertRule)

    # Include global rules and rules for the selected device.
    if device_id is not None:
        query = query.filter(
            (AlertRule.device_id == device_id)
            | (AlertRule.device_id.is_(None))
        )

    if sensor_type:
        normalized_sensor_type = sensor_type.strip().lower()

        if normalized_sensor_type not in ALLOWED_SENSOR_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sensor type filter",
            )

        query = query.filter(
            AlertRule.sensor_type == normalized_sensor_type
        )

    if is_active is not None:
        query = query.filter(
            AlertRule.is_active == is_active
        )

    return (
        query.order_by(AlertRule.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


# GET ONE ALERT RULE
@router.get(
    "/{rule_id}",
    response_model=AlertRuleResponse,
)
def get_alert_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)
    return get_rule_or_404(db, rule_id)


# ACTIVATE / DEACTIVATE ALERT RULE - ADMIN ONLY

@router.patch(
    "/{rule_id}/status",
    response_model=AlertRuleResponse,
)
def update_alert_rule_status(
    rule_id: int,
    is_active: bool = Query(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    rule = get_rule_or_404(db, rule_id)

    if is_active and rule.device_id is not None:
        get_active_device_or_400(db, rule.device_id)

    if rule.is_active == is_active:
        return rule

    rule.is_active = is_active

    try:
        db.commit()
        db.refresh(rule)
        return rule

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to update alert rule status")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update alert rule",
        )


