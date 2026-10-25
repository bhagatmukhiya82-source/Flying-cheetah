from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, Field

class DemoBookingCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, example="Rohan Sharma")
    email: EmailStr = Field(..., example="rohan@spiceheritage.com")
    phone: str = Field(..., min_length=7, max_length=30, example="+91 98111 87654")
    company: str = Field(..., min_length=2, max_length=150, example="Spice Heritage Foods")
    modules: List[str] = Field(default_factory=list, example=["WhatsApp Automation", "AI Voice Agents"])
    scheduled_time: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    honeypot: Optional[str] = Field(None, alias="_hp_security_code")

class DemoBookingResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    company: str
    modules: List[str]
    scheduled_time: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
