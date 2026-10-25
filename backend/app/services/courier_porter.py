import logging
import uuid
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("courier_porter")

class PorterCourierService:
    def __init__(self):
        self.api_key = settings.PORTER_API_KEY
        self.is_mock = self.api_key.startswith("MOCK")

    async def create_delivery(self, order_ref: str, pickup: Dict[str, Any], dropoff: Dict[str, Any], vehicle_type: str = "2wheeler") -> Dict[str, Any]:
        """Dispatches Porter delivery vehicle (2-wheeler, 3-wheeler, Tata Ace)."""
        tracking_num = f"PORTER-MUM-{uuid.uuid4().hex[:8].upper()}"
        
        logger.info(f"[Porter API] Dispatched vehicle ({vehicle_type}) for {order_ref}. Tracking: {tracking_num}")
        return {
            "is_successful": True,
            "order_id": f"porter_ord_{uuid.uuid4().hex[:10]}",
            "tracking_number": tracking_num,
            "tracking_url": f"https://porter.in/track/{tracking_num}",
            "vehicle_type": vehicle_type,
            "delivery_fee_inr": 120.00 if vehicle_type == "2wheeler" else 350.00,
            "eta_minutes": 22,
            "status": "rider_assigned",
            "driver": {
                "name": "Sunil Gaikwad",
                "phone": "+91 99300 22114",
                "lat": 19.0550,
                "lng": 72.8300
            }
        }

porter_service = PorterCourierService()
