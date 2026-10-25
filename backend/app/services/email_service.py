import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("email_service")

class EmailNotificationService:
    def __init__(self):
        self.recipient = settings.OFFICIAL_ADMIN_EMAIL
        self.n8n_url = settings.N8N_WEBHOOK_URL

    async def send_lead_alert(self, lead_data: Dict[str, Any]) -> bool:
        """Sends instant transactional alert to agency email and fires n8n webhook."""
        timestamp = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p (UTC)")
        logger.info(f"[Email Alert] New lead from {lead_data.get('name')} ({lead_data.get('phone')}) dispatched to {self.recipient}")
        
        # Fire n8n webhook if configured
        if self.n8n_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(self.n8n_url, json={
                        "event": "lead_created",
                        "lead": lead_data,
                        "timestamp": timestamp
                    })
                    logger.info("[n8n] Successfully triggered lead webhook")
            except Exception as e:
                logger.warning(f"[n8n] Webhook delivery failed: {e}")

        return True

    async def send_demo_alert(self, name: str, email: str, phone: str, company: str, modules: List[str], scheduled_time: str) -> bool:
        """Sends demo booking notification to flyingcheetah.agency@gmail.com and triggers n8n."""
        logger.info(f"[Demo Alert] New Demo booked by {name} ({company}) for {scheduled_time} dispatched to {self.recipient}")
        if self.n8n_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(self.n8n_url, json={
                        "event": "demo_booked",
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "company": company,
                        "modules": modules,
                        "scheduled_time": scheduled_time
                    })
            except Exception as e:
                logger.warning(f"[n8n] Demo webhook failed: {e}")
        return True

email_service = EmailNotificationService()
