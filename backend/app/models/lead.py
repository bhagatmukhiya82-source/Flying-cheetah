import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON
from app.core.database import Base

class LeadInquiry(Base):
    __tablename__ = "leads_inquiries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(30), nullable=False)
    service_interested = Column(String(100), default="General Consultation", nullable=False)
    message = Column(Text, nullable=True)
    source_page = Column(String(100), default="index.html", nullable=False)
    status = Column(String(20), default="new", nullable=False, index=True) # new, contacted, qualified, converted, closed
    utm_metadata = Column(JSON, default=dict, nullable=True)
    assigned_to = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
