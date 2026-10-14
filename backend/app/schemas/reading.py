from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SensorReadingCreate(BaseModel):
    event_id: str
    timestamp: datetime
    temperature: float
    humidity: float
    vibration: float
    battery_level: float


class SensorReadingResponse(BaseModel):
    id: int
    event_id: str
    device_id: int
    timestamp: datetime
    temperature: float
    humidity: float
    vibration: float
    battery_level: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
