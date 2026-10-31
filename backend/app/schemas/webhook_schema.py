from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class WhatsAppWebhookPayload(BaseModel):
    object: Optional[str] = "whatsapp_business_account"
    entry: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class InstagramWebhookPayload(BaseModel):
    object: Optional[str] = "instagram"
    entry: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class CourierGPSPayload(BaseModel):
    order_ref: str = Field(..., examples=["FC-MUM-9821"])
    courier: str = Field(..., examples=["borzo"])
    rider_name: Optional[str] = Field(None, examples=["Suresh Patil"])
    rider_phone: Optional[str] = Field(None, examples=["+91 98765 11223"])
    latitude: float = Field(..., examples=[19.0760])
    longitude: float = Field(..., examples=[72.8777])
    eta_minutes: Optional[int] = Field(None, examples=[12])
    status: Optional[str] = Field("in_transit", examples=["in_transit"])

