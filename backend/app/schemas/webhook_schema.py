from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class WhatsAppWebhookPayload(BaseModel):
    object: Optional[str] = "whatsapp_business_account"
    entry: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class InstagramWebhookPayload(BaseModel):
    object: Optional[str] = "instagram"
    entry: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class CourierGPSPayload(BaseModel):
    order_ref: str = Field(..., example="FC-MUM-9821")
    courier: str = Field(..., example="borzo")
    rider_name: Optional[str] = Field(None, example="Suresh Patil")
    rider_phone: Optional[str] = Field(None, example="+91 98765 11223")
    latitude: float = Field(..., example=19.0760)
    longitude: float = Field(..., example=72.8777)
    eta_minutes: Optional[int] = Field(None, example=12)
    status: Optional[str] = Field("in_transit", example="in_transit")
