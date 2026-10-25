import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON
from app.core.database import Base

class DemoBooking(Base):
    __tablename__ = "demo_bookings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(30), nullable=False)
    company = Column(String(150), nullable=False)
    modules = Column(JSON, default=list, nullable=False) # stored as JSON list for SQLite & Postgres compatibility
    scheduled_time = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), default="confirmed", nullable=False, index=True) # confirmed, attended, cancelled, rescheduled
    google_calendar_event_id = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
