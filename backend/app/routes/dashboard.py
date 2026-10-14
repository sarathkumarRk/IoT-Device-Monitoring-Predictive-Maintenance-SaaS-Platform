from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.device import Device
from app.models.alert import Alert
from app.models.maintenance_task import MaintenanceTask
from app.models.user import User

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_devices = db.query(Device).count()

    online_devices = db.query(Device).filter(
        Device.status == "ONLINE"
    ).count()

    offline_devices = db.query(Device).filter(
        Device.status == "OFFLINE"
    ).count()

    warning_devices = db.query(Device).filter(
        Device.status == "WARNING"
    ).count()

    critical_devices = db.query(Device).filter(
        Device.status == "CRITICAL"
    ).count()

    open_alerts = db.query(Alert).filter(
        Alert.status == "OPEN"
    ).count()

    critical_alerts = db.query(Alert).filter(
        Alert.severity == "CRITICAL",
        Alert.status != "RESOLVED",
    ).count()

    open_maintenance_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.status.in_(["OPEN", "IN_PROGRESS"])
    ).count()

    return {
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "warning_devices": warning_devices,
        "critical_devices": critical_devices,
        "open_alerts": open_alerts,
        "critical_alerts": critical_alerts,
        "open_maintenance_tasks": open_maintenance_tasks,
    }
