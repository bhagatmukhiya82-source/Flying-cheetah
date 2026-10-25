from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class VoiceCallTrigger(BaseModel):
    phone: str = Field(..., min_length=7, max_length=30, example="+91 98200 44556")
    order_ref: str = Field(..., example="ORD-7819-MUM")
    customer_name: str = Field(..., example="Pooja Verma")
    call_type: str = Field("cod_verification", example="cod_verification")
    amount_inr: Optional[float] = Field(None, example=2499.00)
    items_summary: Optional[str] = Field(None, example="Handcrafted Silk Kurta (Size 38)")

class VoiceCallResponse(BaseModel):
    id: str
    call_sid: str
    phone: str
    call_type: str
    status: str
    intent: str
    duration_seconds: int
    transcript: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
