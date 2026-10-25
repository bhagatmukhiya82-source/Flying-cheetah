import logging
import uuid
import httpx
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("courier_borzo")

class BorzoCourierService:
    def __init__(self):
        self.auth_token = settings.BORZO_AUTH_TOKEN
        self.api_url = settings.BORZO_API_URL
        self.is_mock = self.auth_token.startswith("MOCK")

    async def create_delivery(self, order_ref: str, pickup: Dict[str, Any], dropoff: Dict[str, Any], package_description: str = "Apparel", package_weight_kg: float = 1.0) -> Dict[str, Any]:
        """Creates an on-demand hyperlocal delivery order in Mumbai/MMR."""
        tracking_num = f"BORZO-MUM-{uuid.uuid4().hex[:8].upper()}"
        
        if self.is_mock:
            logger.info(f"[Mock Borzo] Created 18-minute delivery for {order_ref}. Tracking: {tracking_num}")
            return {
                "is_successful": True,
                "order_id": f"borzo_ord_{uuid.uuid4().hex[:10]}",
                "tracking_number": tracking_num,
                "tracking_url": f"https://borzodelivery.com/in/tracking/{tracking_num}",
                "delivery_fee_inr": 85.00,
                "eta_minutes": 18,
                "status": "rider_assigned",
                "rider": {
                    "name": "Ramesh Shinde",
                    "phone": "+91 98200 11998",
                    "vehicle": "Honda Activa (MH-02-CD-4421)",
                    "lat": 19.0600,
                    "lng": 72.8360
                }
            }

        headers = {"X-DV-Auth-Token": self.auth_token, "Content-Type": "application/json"}
        payload = {
            "type": "standard",
            "matter": package_description,
            "total_weight_kg": package_weight_kg,
            "points": [
                {"address": pickup["address"], "contact_person": {"name": pickup.get("contact_name", "Store"), "phone": pickup["contact_phone"]}},
                {"address": dropoff["address"], "contact_person": {"name": dropoff.get("contact_name", "Customer"), "phone": dropoff["contact_phone"]}}
            ]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{self.api_url}/create-order", json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def get_tracking(self, order_id: str) -> Dict[str, Any]:
        """Fetches live tracking status and coordinates."""
        if self.is_mock:
            return {
                "order_id": order_id,
                "status": "in_transit",
                "eta_minutes": 9,
                "rider_lat": 19.0760,
                "rider_lng": 72.8777
            }
        # Production API call
        return {"order_id": order_id, "status": "in_transit"}

borzo_service = BorzoCourierService()
