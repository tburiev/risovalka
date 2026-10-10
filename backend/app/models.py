from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import logging

logger = logging.getLogger(__name__)


class Polygon(Base):
    __tablename__ = "polygons"

    id = Column(String, primary_key=True, index=True)
    fill = Column(String, nullable=False, default="#4682B4")
    stroke = Column(String, nullable=False, default="#2c5f8a")
    stroke_width = Column(Float, nullable=False, default=2.0)
    opacity = Column(Float, nullable=False, default=0.7)
    z_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    points = relationship(
        "Point",
        back_populates="polygon",
        cascade="all, delete-orphan",
        order_by="Point.order_index"
    )


class Point(Base):
    __tablename__ = "points"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    polygon_id = Column(String, ForeignKey("polygons.id", ondelete="CASCADE"), nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    polygon = relationship("Polygon", back_populates="points")


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ip_address = Column(String, nullable=False, index=True)
    user_agent = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    visit_time = Column(DateTime(timezone=True), server_default=func.now())
