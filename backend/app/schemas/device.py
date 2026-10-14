from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DeviceCreate(BaseModel):
    device_code: str
    name: str
    device_type: str
    location: str | None = None
    site_id: int
    installation_date: date | None = None

    temperature_min: float = 0
    temperature_max: float = 80
    humidity_min: float = 0
    humidity_max: float = 100
    vibration_max: float = 5
    reporting_interval: int = 60


class DeviceResponse(BaseModel):
    id: int
    device_code: str
    name: str
    device_type: str
    location: str | None
    site_id: int
    installation_date: date | None

    status: str
    is_active: str
    lifecycle_status: str

    temperature_min: float
    temperature_max: float
    humidity_min: float
    humidity_max: float
    vibration_max: float
    reporting_interval: int

    last_seen: datetime | None
    document_url: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
