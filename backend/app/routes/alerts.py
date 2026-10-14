import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.alert import Alert
from app.models.alert_history import AlertHistory
from app.models.user import User
from app.schemas.alert import AlertResponse, AlertResolve
from app.services.websocket_service import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["Alerts"])

ALLOWED_ROLES = {"ADMIN", "OPERATOR", "VIEWER"}
ACTION_ROLES = {"ADMIN", "OPERATOR"}
ALLOWED_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_ALERT_STATUSES = {"OPEN", "ACKNOWLEDGED", "RESOLVED"}


# HELPERS
def ensure_valid_role(user: User) -> str:
    role = (user.role or "").upper()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )

    return role


def ensure_action_permission(user: User) -> None:
    role = ensure_valid_role(user)

    if role not in ACTION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Operator access required",
        )


async def broadcast_alert_event(payload: dict) -> None:
    try:
        await websocket_manager.broadcast(payload)
    except Exception:
        logger.exception("Alert WebSocket broadcast failed")


def get_alert_or_404(db: Session, alert_id: int) -> Alert:
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    return alert


def record_alert_history(
    db: Session,
    alert: Alert,
    user: User,
    previous_status: str | None,
    new_status: str,
    notes: str | None = None,
) -> None:
    db.add(
        AlertHistory(
            alert_id=alert.id,
            user_id=user.id,
            previous_status=previous_status,
            new_status=new_status,
            notes=notes,
            changed_at=datetime.now(timezone.utc),
        )
    )


def validate_alert_fields(alert: Alert) -> None:
    if alert.status not in ALLOWED_ALERT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Alert contains an invalid status",
        )

    if alert.severity not in ALLOWED_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Alert contains an invalid severity",
        )


# LIST ALERTS
# ADMIN / OPERATOR / VIEWER
@router.get("/", response_model=list[AlertResponse])
def get_alerts(
    alert_status: str | None = Query(None, alias="status"),
    severity: str | None = Query(None),
    device_id: int | None = Query(None, ge=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    query = db.query(Alert)

    if alert_status:
        normalized_status = alert_status.upper()

        if normalized_status not in ALLOWED_ALERT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid alert status filter",
            )

        query = query.filter(Alert.status == normalized_status)

    if severity:
        normalized_severity = severity.upper()

        if normalized_severity not in ALLOWED_SEVERITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid severity filter",
            )

        query = query.filter(Alert.severity == normalized_severity)

    if device_id is not None:
        query = query.filter(Alert.device_id == device_id)

    return (
        query.order_by(
            Alert.triggered_at.desc(),
            Alert.id.desc(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

# GET ONE ALERT
@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    alert = get_alert_or_404(db, alert_id)
    validate_alert_fields(alert)

    return alert

# GET ALERT HISTORY
@router.get("/{alert_id}/history")
def get_alert_history(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)
    get_alert_or_404(db, alert_id)

    history = (
        db.query(AlertHistory)
        .filter(AlertHistory.alert_id == alert_id)
        .order_by(
            AlertHistory.changed_at.asc(),
            AlertHistory.id.asc(),
        )
        .all()
    )

    return [
        {
            "id": item.id,
            "alert_id": item.alert_id,
            "user_id": item.user_id,
            "previous_status": item.previous_status,
            "new_status": item.new_status,
            "notes": item.notes,
            "changed_at": item.changed_at,
        }
        for item in history
    ]

# ACKNOWLEDGE ALERT
# ADMIN / OPERATOR ONLY
@router.patch(
    "/{alert_id}/acknowledge",
    response_model=AlertResponse,
)
async def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_action_permission(current_user)

    alert = get_alert_or_404(db, alert_id)
    validate_alert_fields(alert)

    if alert.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only open alerts can be acknowledged",
        )

    previous_status = alert.status
    now = datetime.now(timezone.utc)

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = now

    record_alert_history(
        db=db,
        alert=alert,
        user=current_user,
        previous_status=previous_status,
        new_status="ACKNOWLEDGED",
        notes="Alert acknowledged",
    )

    try:
        db.commit()
        db.refresh(alert)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to acknowledge alert")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to acknowledge alert",
        )

    await broadcast_alert_event(
        {
            "type": "alert_updated",
            "alert_id": alert.id,
            "device_id": alert.device_id,
            "severity": alert.severity,
            "status": alert.status,
            "acknowledged_at": (
                alert.acknowledged_at.isoformat()
                if alert.acknowledged_at
                else None
            ),
        }
    )

    return alert



# RESOLVE ALERT
# ADMIN / OPERATOR ONLY
@router.patch(
    "/{alert_id}/resolve",
    response_model=AlertResponse,
)
async def resolve_alert(
    alert_id: int,
    resolve_data: AlertResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_action_permission(current_user)

    notes = (resolve_data.resolution_notes or "").strip()

    if not notes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resolution notes are required",
        )

    alert = get_alert_or_404(db, alert_id)
    validate_alert_fields(alert)

    if alert.status not in {"OPEN", "ACKNOWLEDGED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alert is already resolved",
        )

    previous_status = alert.status

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_notes = notes

    record_alert_history(
        db=db,
        alert=alert,
        user=current_user,
        previous_status=previous_status,
        new_status="RESOLVED",
        notes=notes,
    )

    try:
        db.commit()
        db.refresh(alert)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to resolve alert")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve alert",
        )

    await broadcast_alert_event(
        {
            "type": "alert_updated",
            "alert_id": alert.id,
            "device_id": alert.device_id,
            "severity": alert.severity,
            "status": alert.status,
            "resolved_at": (
                alert.resolved_at.isoformat()
                if alert.resolved_at
                else None
            ),
        }
    )

    return alert

