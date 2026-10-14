from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    id: int
    device_id: int
    rule_id: int
    severity: str
    message: str
    status: str
    triggered_at: datetime
    acknowledged_by: int | None
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    resolution_notes: str | None

    model_config = ConfigDict(from_attributes=True)


class AlertResolve(BaseModel):
    resolution_notes: str