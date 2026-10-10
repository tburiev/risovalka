from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PointBase(BaseModel):
    x: float
    y: float


class PointCreate(PointBase):
    order_index: int = 0


class PointResponse(PointBase):
    id: int
    polygon_id: str
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True


class PolygonBase(BaseModel):
    fill: str = "#4682B4"
    stroke: str = "#2c5f8a"
    stroke_width: float = 2.0
    opacity: float = Field(default=0.7, ge=0.0, le=1.0)


class PolygonCreate(PolygonBase):
    id: Optional[str] = None
    points: List[PointCreate] = Field(..., min_length=3)


class PolygonUpdate(BaseModel):
    fill: Optional[str] = None
    stroke: Optional[str] = None
    stroke_width: Optional[float] = None
    opacity: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    z_index: Optional[int] = None


class PolygonResponse(PolygonBase):
    id: str
    z_index: int
    points: List[PointResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PolygonListResponse(BaseModel):
    polygons: List[PolygonResponse]
    total: int


class MessageResponse(BaseModel):
    message: str
    id: Optional[str] = None


class VisitorResponse(BaseModel):
    id: int
    ip_address: str
    user_agent: Optional[str] = None
    browser: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    visit_count: int
    first_visit: datetime
    last_visit: datetime

    class Config:
        from_attributes = True


class VisitorListResponse(BaseModel):
    visitors: List[VisitorResponse]
    total: int
