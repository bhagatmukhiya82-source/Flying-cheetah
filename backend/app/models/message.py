import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON
from app.core.database import Base

class OmnichannelMessage(Base):
    __tablename__ = "omnichannel_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(100), nullable=False, index=True)
    channel = Column(String(20), default="whatsapp", nullable=False, index=True) # whatsapp, instagram, rcs, sms, webchat
    direction = Column(String(10), nullable=False) # inbound, outbound
    external_message_id = Column(String(255), nullable=True)
    sender_id = Column(String(100), nullable=False)
    recipient_id = Column(String(100), nullable=False)
    content = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=True)
    status = Column(String(20), default="queued", nullable=False) # queued, sent, delivered, read, failed
    metadata_json = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
