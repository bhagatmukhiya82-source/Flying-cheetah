import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON
from app.core.database import Base

class StorefrontSpeedAudit(Base):
    __tablename__ = "storefront_speed_audits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    target_url = Column(Text, nullable=False, index=True)
    fcp_score = Column(Float, nullable=True)
    lcp_score = Column(Float, nullable=True)
    cls_score = Column(Float, nullable=True)
    fid_score = Column(Float, nullable=True)
    performance_score = Column(Integer, nullable=True) # 0-100
    recommendations = Column(JSON, default=list, nullable=True)
    requested_by_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), nullable=True)
    actor_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=True)
    payload = Column(JSON, default=dict, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
