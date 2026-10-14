from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SiteCreate(BaseModel):
    name: str
    location: str


class SiteResponse(BaseModel):
    id: int
    name: str
    location: str
    created_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)