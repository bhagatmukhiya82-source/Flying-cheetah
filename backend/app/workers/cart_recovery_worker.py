import asyncio
import logging
from typing import List, Dict, Any
from app.workers.celery_app import celery_app
from app.services.meta_whatsapp import whatsapp_service
from app.core.database import async_session_factory
from app.models.message import OmnichannelMessage

logger = logging.getLogger("cart_recovery_worker")

async def _async_send_cart_recovery(customer_phone: str, customer_name: str, cart_items: List[str], recovery_url: str, total_inr: float):
    logger.info(f"[Cart Recovery Worker] Dispatching WhatsApp nudge to {customer_phone} for ₹{total_inr}")
    
    # Send interactive WhatsApp template with 1-tap checkout link
    result = await whatsapp_service.send_cart_recovery_template(
        to_phone=customer_phone,
        customer_name=customer_name,
        cart_items=cart_items,
        checkout_url=recovery_url
    )

    # Persist outbound message audit
    async with async_session_factory() as session:
        msg = OmnichannelMessage(
            conversation_id=customer_phone,
            channel="whatsapp",
            direction="outbound",
            sender_id="system_cart_recovery",
            recipient_id=customer_phone,
            content=f"Cart Recovery nudge for ₹{total_inr}: {recovery_url}",
            status="sent" if result.get("is_successful") else "failed",
            metadata_json={"cart_items": cart_items, "total_inr": total_inr}
        )
        session.add(msg)
        await session.commit()

    return result

@celery_app.task(name="app.workers.cart_recovery_worker.send_abandoned_cart_recovery")
def send_abandoned_cart_recovery(customer_phone: str, customer_name: str, cart_items: List[str], recovery_url: str, total_inr: float = 0.0):
    """
    15-Minute Abandoned Cart Worker.
    Fires 15 minutes after checkout is abandoned. Sends WhatsApp message with 1-tap UPI checkout link.
    """
    return asyncio.run(_async_send_cart_recovery(customer_phone, customer_name, cart_items, recovery_url, total_inr))
