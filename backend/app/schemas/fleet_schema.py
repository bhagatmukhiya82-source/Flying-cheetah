from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class FleetDispatchCreate(BaseModel):
    order_ref: str = Field(..., examples=["FC-MUM-9821"])
    courier: Optional[str] = Field("borzo", examples=["borzo"]) # borzo or porter
    pickup_address: Dict[str, Any] = Field(
        ...,
        examples=[{
            "address": "Shop 4, Linking Road, Bandra West, Mumbai 400050",
            "contact_name": "Store Manager",
            "contact_phone": "+91 98200 99887"
        }]
    )
    delivery_address: Dict[str, Any] = Field(
        ...,
        examples=[{
            "address": "Flat 802, Sea View Apts, Worli Sea Face, Mumbai 400018",
            "contact_name": "Kavita Singhania",
            "contact_phone": "+91 98199 44332"
        }]
    )
    package_description: Optional[str] = Field("Fragile Apparel Parcel", examples=["Fragile Apparel Parcel"])
    package_weight_kg: Optional[float] = Field(1.5, examples=[1.5])

class FleetTrackingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_ref: str
    courier: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    rider_name: Optional[str] = None
    rider_phone: Optional[str] = None
    rider_lat: Optional[float] = None
    rider_lng: Optional[float] = None
    eta_minutes: Optional[int] = None
    status: str
    delivery_fee_inr: Optional[float] = None
    updated_at: datetime

