from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class LeadCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, examples=["Aarav Mehta"])
    email: EmailStr = Field(..., examples=["aarav@mumbaicouture.in"])
    phone: str = Field(..., min_length=7, max_length=30, examples=["+91 98201 23456"])
    service: Optional[str] = Field(default="General Consultation", alias="service_interested", examples=["Store Automation"])
    message: Optional[str] = Field(None, examples=["Need WhatsApp abandoned cart recovery."])
    source_page: Optional[str] = Field(default="index.html", examples=["store-automation.html"])
    utm_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    honeypot: Optional[str] = Field(None, alias="_hp_security_code")

class LeadUpdate(BaseModel):
    status: Optional[str] = Field(None, examples=["contacted"]) # new, contacted, qualified, converted, closed
    service_interested: Optional[str] = None
    message: Optional[str] = None
    assigned_to: Optional[str] = None

class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

class LeadListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[LeadResponse]

