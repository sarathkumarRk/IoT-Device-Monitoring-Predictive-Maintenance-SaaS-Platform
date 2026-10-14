from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class MaintenanceTaskCreate(BaseModel):
    device_id: int
    assigned_to: int | None = None
    description: str
    priority: str = "MEDIUM"
    due_date: date | None = None


class MaintenanceTaskUpdate(BaseModel):
    assigned_to: int | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: date | None = None
    completion_details: str | None = None


class MaintenanceTaskResponse(BaseModel):
    id: int
    device_id: int
    assigned_to: int | None
    description: str
    priority: str
    status: str
    due_date: date | None
    completion_details: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class MaintenanceLogCreate(BaseModel):
    notes: str