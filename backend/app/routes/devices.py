import logging

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, admin_required
from app.models.device import Device
from app.models.site import Site
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceResponse
from app.services.storage_service import upload_device_document
from app.services.websocket_service import websocket_manager


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/devices", tags=["Devices"])

ALLOWED_ROLES = {"ADMIN", "OPERATOR", "VIEWER"}

ALLOWED_STATUSES = {
    "ONLINE",
    "OFFLINE",
    "WARNING",
    "CRITICAL",
}

ALLOWED_LIFECYCLE_STATUSES = {
    "ACTIVE",
    "INACTIVE",
    "RETIRED",
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

SORT_FIELDS = {
    "id": Device.id,
    "name": Device.name,
    "device_code": Device.device_code,
    "device_type": Device.device_type,
    "installation_date": Device.installation_date,
    "created_at": Device.created_at,
}


# HELPERS

def ensure_valid_role(user: User) -> None:
    role = (user.role or "").upper()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource",
        )


def get_device_or_404(db: Session, device_id: int) -> Device:
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

    return device


def ensure_device_is_active(device: Device) -> None:
    if (
        device.lifecycle_status != "ACTIVE"
        or device.is_active != "ACTIVE"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This operation requires an active device",
        )


def save_device(db: Session, device: Device, error_message: str) -> Device:
    try:
        db.commit()
        db.refresh(device)
        return device

    except SQLAlchemyError:
        db.rollback()
        logger.exception(error_message)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message,
        )


async def broadcast_device_status(device: Device) -> None:
    message = {
        "event": "device_status_updated",
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

    try:
        await websocket_manager.broadcast(message)
    except Exception:
        logger.exception("Device status WebSocket broadcast failed")

# CREATE DEVICE - ADMIN ONLY
@router.post(
    "/",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_device(
    device_data: DeviceCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    if device_data.temperature_min >= device_data.temperature_max:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum temperature must be less than maximum temperature",
        )

    if device_data.humidity_min >= device_data.humidity_max:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum humidity must be less than maximum humidity",
        )

    if device_data.vibration_max <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum vibration must be greater than zero",
        )

    if device_data.reporting_interval <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporting interval must be greater than zero",
        )

    existing_device = (
        db.query(Device)
        .filter(Device.device_code == device_data.device_code)
        .first()
    )

    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device code already exists",
        )

    site = (
        db.query(Site)
        .filter(Site.id == device_data.site_id)
        .first()
    )

    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )

    device = Device(
        device_code=device_data.device_code,
        name=device_data.name,
        device_type=device_data.device_type,
        location=device_data.location,
        site_id=device_data.site_id,
        installation_date=device_data.installation_date,
        temperature_min=device_data.temperature_min,
        temperature_max=device_data.temperature_max,
        humidity_min=device_data.humidity_min,
        humidity_max=device_data.humidity_max,
        vibration_max=device_data.vibration_max,
        reporting_interval=device_data.reporting_interval,
        status="OFFLINE",
        is_active="ACTIVE",
        lifecycle_status="ACTIVE",
        document_url=None,
    )

    try:
        db.add(device)
        db.commit()
        db.refresh(device)
        return device

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device code already exists or device data conflicts",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to register device")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register device",
        )

# LIST DEVICES - ADMIN / OPERATOR / VIEWER
# SEARCH, FILTER, SORT, PAGINATION

@router.get("/", response_model=list[DeviceResponse])
def get_devices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str | None = Query(None, min_length=1),
    device_status: str | None = Query(None),
    site_id: int | None = Query(None, ge=1),
    lifecycle_status: str | None = Query(None),
    sort_by: str = Query("id"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)

    query = db.query(Device)

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Device.name.ilike(search_term),
                Device.device_code.ilike(search_term),
                Device.device_type.ilike(search_term),
                Device.location.ilike(search_term),
            )
        )

    if device_status:
        normalized_status = device_status.upper()

        if normalized_status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid device status filter",
            )

        query = query.filter(Device.status == normalized_status)

    if lifecycle_status:
        normalized_lifecycle = lifecycle_status.upper()

        if normalized_lifecycle not in ALLOWED_LIFECYCLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid lifecycle status filter",
            )

        query = query.filter(
            Device.lifecycle_status == normalized_lifecycle
        )

    if site_id is not None:
        query = query.filter(Device.site_id == site_id)

    if sort_by not in SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by. Allowed fields: {', '.join(SORT_FIELDS)}",
        )

    normalized_order = sort_order.lower()

    if normalized_order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort_order must be 'asc' or 'desc'",
        )

    sort_column = SORT_FIELDS[sort_by]

    if normalized_order == "desc":
        sort_column = sort_column.desc()
    else:
        sort_column = sort_column.asc()

    return (
        query.order_by(sort_column, Device.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

# GET DEVICE BY ID
@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_valid_role(current_user)
    return get_device_or_404(db, device_id)

# UPDATE DEVICE STATUS - ADMIN ONLY
@router.patch(
    "/{device_id}/status",
    response_model=DeviceResponse,
)
async def update_device_status(
    device_id: int,
    new_status: str = Query(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    normalized_status = new_status.upper()

    if normalized_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid device status",
        )

    device = get_device_or_404(db, device_id)
    ensure_device_is_active(device)

    device.status = normalized_status

    save_device(db, device, "Failed to update device status")
    await broadcast_device_status(device)

    return device


# ACTIVATE DEVICE - ADMIN ONLY

@router.patch(
    "/{device_id}/activate",
    response_model=DeviceResponse,
)
async def activate_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    device = get_device_or_404(db, device_id)

    if device.lifecycle_status == "RETIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A retired device cannot be activated",
        )

    device.is_active = "ACTIVE"
    device.lifecycle_status = "ACTIVE"
    device.status = "OFFLINE"

    save_device(db, device, "Failed to activate device")
    await broadcast_device_status(device)

    return device

# DEACTIVATE DEVICE - ADMIN ONLY
@router.patch(
    "/{device_id}/deactivate",
    response_model=DeviceResponse,
)
async def deactivate_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    device = get_device_or_404(db, device_id)

    if device.lifecycle_status == "RETIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A retired device cannot be deactivated again",
        )

    device.is_active = "INACTIVE"
    device.lifecycle_status = "INACTIVE"
    device.status = "OFFLINE"

    save_device(db, device, "Failed to deactivate device")
    await broadcast_device_status(device)

    return device

# RETIRE DEVICE - ADMIN ONLY
@router.patch(
    "/{device_id}/retire",
    response_model=DeviceResponse,
)
async def retire_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    device = get_device_or_404(db, device_id)

    device.is_active = "INACTIVE"
    device.lifecycle_status = "RETIRED"
    device.status = "OFFLINE"

    save_device(db, device, "Failed to retire device")
    await broadcast_device_status(device)

    return device

# UPLOAD DEVICE DOCUMENT - ADMIN ONLY
@router.post("/{device_id}/upload-document")
async def upload_document(
    device_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    try:
        device = get_device_or_404(db, device_id)
        ensure_device_is_active(device)

        if file.content_type not in ALLOWED_DOCUMENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, JPG and PNG files are allowed",
            )

        content = await file.read(MAX_DOCUMENT_SIZE + 1)

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        if len(content) > MAX_DOCUMENT_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File size must not exceed 10 MB",
            )

        result = upload_device_document(content)

        if not result.get("success") or not result.get("url"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Document upload failed. Check Cloudinary configuration.",
            )

        device.document_url = result["url"]

        save_device(
            db,
            device,
            "Document uploaded, but failed to save its URL",
        )

        return {
            "message": "Document uploaded and URL saved successfully",
            "device_id": device.id,
            "document_url": device.document_url,
            "public_id": result.get("public_id"),
        }

    finally:
        await file.close()

