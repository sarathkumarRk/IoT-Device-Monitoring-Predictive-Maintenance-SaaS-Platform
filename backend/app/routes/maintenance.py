from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, admin_required
from app.models.maintenance_task import MaintenanceTask
from app.models.device import Device
from app.models.user import User
from app.models.maintenance_log import MaintenanceLog
from app.schemas.maintenance import (
    MaintenanceTaskCreate,
    MaintenanceTaskUpdate,
    MaintenanceTaskResponse,
    MaintenanceLogCreate,
)

router = APIRouter(
    prefix="/maintenance-tasks",
    tags=["Maintenance"],
)

ALLOWED_ROLES = {"ADMIN", "OPERATOR", "VIEWER"}

# Adjust these values if your maintenance model uses different statuses.
ALLOWED_TASK_STATUSES = {
    "OPEN",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
}


def ensure_valid_role(user: User) -> None:
    role = (user.role or "").upper()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )


def ensure_valid_task_status(task_status: str | None) -> None:
    if task_status is not None and task_status.upper() not in ALLOWED_TASK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid task status. Allowed statuses: "
                f"{', '.join(sorted(ALLOWED_TASK_STATUSES))}"
            ),
        )


# CREATE MAINTENANCE TASK - ADMIN ONLY
@router.post(
    "/",
    response_model=MaintenanceTaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_task(
    task_data: MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    device = (
        db.query(Device)
        .filter(Device.id == task_data.device_id)
        .first()
    )

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    if device.is_active != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create maintenance task for an inactive device",
        )

    if task_data.assigned_to is not None:
        operator = (
            db.query(User)
            .filter(
                User.id == task_data.assigned_to,
                User.role == "OPERATOR",
                User.is_active.is_(True),
            )
            .first()
        )

        if operator is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user must be an active operator",
            )

    task = MaintenanceTask(
        device_id=task_data.device_id,
        assigned_to=task_data.assigned_to,
        description=task_data.description,
        priority=task_data.priority,
        status="OPEN",
        due_date=task_data.due_date,
    )

    try:
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create maintenance task",
        )


# LIST MAINTENANCE TASKS - AUTHENTICATED USERS
@router.get(
    "/",
    response_model=list[MaintenanceTaskResponse],
)
def get_maintenance_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    query = db.query(MaintenanceTask)

    # Operators see tasks assigned to them.
    if current_user.role.upper() == "OPERATOR":
        query = query.filter(
            MaintenanceTask.assigned_to == current_user.id
        )

    # Viewers can view tasks but cannot modify them.
    return (
        query.order_by(
            MaintenanceTask.due_date.asc(),
            MaintenanceTask.id.asc(),
        )
        .all()
    )

# UPDATE MAINTENANCE TASK
# ADMIN: Any permitted task field
# OPERATOR: Assigned tasks; status/completion only
# VIEWER: Read-only
@router.patch(
    "/{task_id}",
    response_model=MaintenanceTaskResponse,
)
def update_maintenance_task(
    task_id: int,
    task_data: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    task = (
        db.query(MaintenanceTask)
        .filter(MaintenanceTask.id == task_id)
        .first()
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance task not found",
        )

    role = current_user.role.upper()

    if role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer cannot modify maintenance tasks",
        )

    if role == "OPERATOR":
        if task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can update only your assigned tasks",
            )

    updates = task_data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )

    if "status" in updates:
        ensure_valid_task_status(updates["status"])

    if role == "OPERATOR":
        allowed_fields = {
            "status",
            "completion_details",
        }

        forbidden_fields = set(updates.keys()) - allowed_fields

        if forbidden_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Operators can update only status "
                    "and completion details"
                ),
            )

        if "status" in updates:
            new_status = updates["status"].upper()

            # Operators cannot reopen or cancel tasks.
            if new_status not in {"IN_PROGRESS", "COMPLETED"}:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Operators can move tasks to "
                        "IN_PROGRESS or COMPLETED only"
                    ),
                )

            # Do not allow a completed task to be changed again.
            if task.status.upper() == "COMPLETED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Completed tasks cannot be modified by operators",
                )

    # Only Admin and Operator reach this point.
    for field, value in updates.items():
        setattr(task, field, value)

    if "status" in updates:
        new_status = updates["status"].upper()

        if new_status == "COMPLETED":
            task.completed_at = datetime.now(timezone.utc)
        elif task.status.upper() != "COMPLETED":
            task.completed_at = None

    try:
        db.commit()
        db.refresh(task)
        return task

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update maintenance task",
        )

# ADD MAINTENANCE NOTE
# ADMIN: Any task
# OPERATOR: Assigned tasks only
# VIEWER: Not allowed
@router.post(
    "/{task_id}/notes",
    status_code=status.HTTP_201_CREATED,
)
def add_maintenance_note(
    task_id: int,
    note_data: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    task = (
        db.query(MaintenanceTask)
        .filter(MaintenanceTask.id == task_id)
        .first()
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance task not found",
        )

    role = current_user.role.upper()

    if role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer cannot add maintenance notes",
        )

    if role == "OPERATOR" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can add notes only to your assigned tasks",
        )

    log = MaintenanceLog(
        task_id=task.id,
        user_id=current_user.id,
        notes=note_data.notes,
    )

    try:
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add maintenance note",
        )
