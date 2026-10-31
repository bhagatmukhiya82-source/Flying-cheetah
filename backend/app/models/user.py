import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime
from app.core.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    auth_user_id = Column(String(36), unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(150), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(20), default="client", nullable=False, index=True) # admin, client, agent
    phone = Column(String(30), nullable=True, index=True)
    store_url = Column(String(255), nullable=True)
    business_name = Column(String(200), nullable=True)
    category_niche = Column(String(100), nullable=True)
    gstin_udyam = Column(String(50), nullable=True)
    whatsapp_support = Column(String(30), nullable=True, index=True)
    pickup_address = Column(String(500), nullable=True)
    merchant_upi_id = Column(String(100), nullable=True)
    delivery_radius_km = Column(Integer, default=15, nullable=True)
    trial_active = Column(Boolean, default=True, nullable=False)
    trial_started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    trial_days_left = Column(Integer, default=14, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
