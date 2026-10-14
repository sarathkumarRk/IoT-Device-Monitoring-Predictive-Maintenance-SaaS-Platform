from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AlertRuleCreate(BaseModel):
    name: str
    device_id: int | None = None
    sensor_type: str
    operator: str = ">"
    threshold: float
    duration_seconds: int = 0
    severity: str = "MEDIUM"


class AlertRuleResponse(BaseModel):
    id: int
    name: str
    device_id: int | None
    sensor_type: str
    operator: str
    threshold: float
    duration_seconds: int
    severity: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)