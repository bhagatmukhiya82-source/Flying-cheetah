from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class LeadCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, example="Aarav Mehta")
    email: EmailStr = Field(..., example="aarav@mumbaicouture.in")
    phone: str = Field(..., min_length=7, max_length=30, example="+91 98201 23456")
    service: Optional[str] = Field(default="General Consultation", alias="service_interested", example="Store Automation")
    message: Optional[str] = Field(None, example="Need WhatsApp abandoned cart recovery.")
    source_page: Optional[str] = Field(default="index.html", example="store-automation.html")
    utm_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    honeypot: Optional[str] = Field(None, alias="_hp_security_code")

class LeadUpdate(BaseModel):
    status: Optional[str] = Field(None, example="contacted") # new, contacted, qualified, converted, closed
    service_interested: Optional[str] = None
    message: Optional[str] = None
    assigned_to: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    service_interested: str
    message: Optional[str] = None
    source_page: str
    status: str
    utm_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LeadListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[LeadResponse]
