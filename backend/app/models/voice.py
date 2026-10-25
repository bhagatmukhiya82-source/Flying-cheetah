import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime
from app.core.database import Base

class AIVoiceCall(Base):
    __tablename__ = "ai_voice_calls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_sid = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(30), nullable=False, index=True)
    call_type = Column(String(30), default="cod_verification", nullable=False) # cod_verification, cart_recovery, vip_loyalty, support
    status = Column(String(20), default="initiated", nullable=False, index=True) # initiated, ringing, in_progress, completed, failed, busy
    intent = Column(String(20), default="unclear", nullable=False) # confirmed, cancelled, rescheduled, unclear
    duration_seconds = Column(Integer, default=0, nullable=False)
    transcript = Column(Text, nullable=True)
    recording_url = Column(String(500), nullable=True)
    customer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
