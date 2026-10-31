from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class VoiceCallTrigger(BaseModel):
    phone: str = Field(..., min_length=7, max_length=30, examples=["+91 98200 44556"])
    order_ref: str = Field(..., examples=["ORD-7819-MUM"])
    customer_name: str = Field(..., examples=["Pooja Verma"])
    call_type: str = Field("cod_verification", examples=["cod_verification"])
    amount_inr: Optional[float] = Field(None, examples=[2499.00])
    items_summary: Optional[str] = Field(None, examples=["Handcrafted Silk Kurta (Size 38)"])

class VoiceCallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    call_sid: str
    phone: str
    call_type: str
    status: str
    intent: str
    duration_seconds: int
    transcript: Optional[str] = None
    created_at: datetime

