import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, Numeric
from app.core.database import Base

class FleetOrder(Base):
    __tablename__ = "fleet_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_ref = Column(String(100), nullable=False, index=True)
    courier = Column(String(20), default="borzo", nullable=False, index=True) # borzo, porter, dunzo
    courier_order_id = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)
    tracking_url = Column(Text, nullable=True)
    pickup_address = Column(JSON, nullable=False)
    delivery_address = Column(JSON, nullable=False)
    rider_name = Column(String(150), nullable=True)
    rider_phone = Column(String(30), nullable=True)
    rider_lat = Column(Float, nullable=True)
    rider_lng = Column(Float, nullable=True)
    eta_minutes = Column(Integer, nullable=True)
    status = Column(String(20), default="assigning", nullable=False, index=True) # assigning, rider_assigned, picked_up, in_transit, delivered, cancelled, failed
    delivery_fee_inr = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
