import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, JSON
from app.core.database import Base

class PaymentTransaction(Base):
    __tablename__ = "payments_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_ref = Column(String(100), nullable=False, index=True)
    payment_gateway = Column(String(50), default="razorpay", nullable=False) # razorpay, cashfree, manual_cod
    gateway_order_id = Column(String(100), nullable=True, index=True)
    gateway_payment_id = Column(String(100), nullable=True, unique=True, index=True)
    amount_inr = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(30), default="pending", nullable=False, index=True) # pending, authorized, captured, failed, refunded
    method = Column(String(50), nullable=True) # upi, card, netbanking, wallet, cod
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(30), nullable=True)
    raw_webhook_payload = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
