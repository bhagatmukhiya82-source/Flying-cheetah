import logging
import uuid
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("payment_upi")

class PaymentUPIService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.is_mock = self.key_id.startswith("rzp_test_flying")

    async def generate_upi_payment_link(self, order_ref: str, amount_inr: float, customer_phone: str, customer_name: str) -> Dict[str, Any]:
        """Generates dynamic 1-tap UPI payment link and QR string for WhatsApp chat checkout."""
        link_id = f"plink_{uuid.uuid4().hex[:12]}"
        short_url = f"https://rzp.io/i/{link_id[:8]}"
        upi_intent_string = f"upi://pay?pa=flyingcheetah@hdfcbank&pn=FlyingCheetahLabs&am={amount_inr}&tr={order_ref}&cu=INR&tn=Order_{order_ref}"

        logger.info(f"[UPI Engine] Created payment link for {order_ref} (₹{amount_inr}) -> {short_url}")
        
        return {
            "payment_link_id": link_id,
            "short_url": short_url,
            "upi_intent_url": upi_intent_string,
            "amount_inr": amount_inr,
            "currency": "INR",
            "customer": {
                "name": customer_name,
                "phone": customer_phone
            },
            "status": "created"
        }

payment_service = PaymentUPIService()
