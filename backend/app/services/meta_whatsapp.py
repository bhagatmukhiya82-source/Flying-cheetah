import logging
import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings

logger = logging.getLogger("meta_whatsapp")

class MetaWhatsAppService:
    def __init__(self):
        self.version = settings.META_GRAPH_VERSION
        self.phone_id = settings.META_PHONE_NUMBER_ID
        self.api_url = f"https://graph.facebook.com/{self.version}/{self.phone_id}/messages"

    @property
    def token(self) -> str:
        return settings.META_WA_TOKEN

    @property
    def is_mock(self) -> bool:
        t = self.token
        return not t or t.startswith("MOCK") or "mock" in t.lower()

    async def send_text_message(
        self,
        recipient_phone: str = "",
        text: str = "",
        to_phone: str = "",
        body: str = ""
    ) -> Dict[str, Any]:
        """Sends standard conversational WhatsApp message."""
        target_phone = to_phone or recipient_phone
        target_text = body or text
        clean_phone = target_phone.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"preview_url": True, "body": target_text}
        }
        
        if self.is_mock:
            logger.info(f"[Mock WA] Sent text to {clean_phone}: '{target_text[:40]}...'")
            return {
                "is_successful": True,
                "messaging_product": "whatsapp",
                "contacts": [{"wa_id": clean_phone}],
                "messages": [{"id": f"wamid.mock_{clean_phone}_001"}]
            }

        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.api_url, json=payload, headers=headers)
                if resp.status_code in [200, 201]:
                    res = resp.json()
                    res["is_successful"] = True
                    return res
                else:
                    err_json = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                    err_msg = err_json.get("error", {}).get("message", resp.text)
                    logger.warning(f"[Meta WA] API responded with HTTP {resp.status_code}: {err_msg}")
                    return {
                        "is_successful": False,
                        "error": err_msg,
                        "status_code": resp.status_code,
                        "messages": [{"id": f"failed_{resp.status_code}"}]
                    }
            except Exception as e:
                logger.error(f"[Meta WA] Connection exception: {e}")
                return {
                    "is_successful": False,
                    "error": str(e),
                    "messages": [{"id": "failed_connection"}]
                }

    async def send_template_message(
        self,
        recipient_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Sends Meta-approved HSM template broadcast."""
        clean_phone = recipient_phone.replace("+", "").replace(" ", "").replace("-", "")
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components or []
            }
        }

        if self.is_mock:
            logger.info(f"[Mock WA] Sent template '{template_name}' to {clean_phone}")
            return {
                "is_successful": True,
                "messaging_product": "whatsapp",
                "contacts": [{"wa_id": clean_phone}],
                "messages": [{"id": f"wamid.mock_tpl_{clean_phone}"}]
            }

        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.api_url, json=payload, headers=headers)
                if resp.status_code in [200, 201]:
                    res = resp.json()
                    res["is_successful"] = True
                    return res
                else:
                    err_json = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                    err_msg = err_json.get("error", {}).get("message", resp.text)
                    logger.warning(f"[Meta WA] Template API HTTP {resp.status_code}: {err_msg}")
                    return {
                        "is_successful": False,
                        "error": err_msg,
                        "status_code": resp.status_code,
                        "messages": [{"id": f"failed_{resp.status_code}"}]
                    }
            except Exception as e:
                logger.error(f"[Meta WA] Template connection exception: {e}")
                return {
                    "is_successful": False,
                    "error": str(e),
                    "messages": [{"id": "failed_connection"}]
                }

    async def send_cart_recovery_button(
        self,
        recipient_phone: str,
        customer_name: str,
        cart_items_summary: str,
        checkout_url: str
    ) -> Dict[str, Any]:
        """Dispatches high-converting 1-tap checkout recovery button."""
        clean_phone = recipient_phone.replace("+", "").replace(" ", "").replace("-", "")
        body_text = (
            f"Hey {customer_name}! 🐆\n\n"
            f"You left something special behind:\n"
            f"🛍️ {cart_items_summary}\n\n"
            f"Your cart has been reserved with an instant 10% coupon applied. Tap below to complete your order in 1 tap!"
        )
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "interactive",
            "interactive": {
                "type": "cta_url",
                "header": {"type": "text", "text": "Cart Reserved for 15 Mins ⏳"},
                "body": {"text": body_text},
                "footer": {"text": "Flying Cheetah Commerce Engine"},
                "action": {
                    "name": "cta_url",
                    "parameters": {
                        "display_text": "Complete Checkout (1-Tap) ⚡",
                        "url": checkout_url
                    }
                }
            }
        }

        if self.is_mock:
            logger.info(f"[Mock WA] Dispatched Cart Recovery CTA to {clean_phone} -> {checkout_url}")
            return {
                "is_successful": True,
                "messaging_product": "whatsapp",
                "messages": [{"id": f"wamid.mock_cart_{clean_phone}"}]
            }

        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.api_url, json=payload, headers=headers)
                if resp.status_code in [200, 201]:
                    res = resp.json()
                    res["is_successful"] = True
                    return res
                else:
                    err_json = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                    err_msg = err_json.get("error", {}).get("message", resp.text)
                    logger.warning(f"[Meta WA] Cart Recovery API HTTP {resp.status_code}: {err_msg}")
                    return {
                        "is_successful": False,
                        "error": err_msg,
                        "status_code": resp.status_code,
                        "messages": [{"id": f"failed_{resp.status_code}"}]
                    }
            except Exception as e:
                logger.error(f"[Meta WA] Cart Recovery connection exception: {e}")
                return {
                    "is_successful": False,
                    "error": str(e),
                    "messages": [{"id": "failed_connection"}]
                }

    async def send_cart_recovery_template(
        self,
        recipient_phone: str = "",
        customer_name: str = "Shopper",
        cart_items: Any = "",
        checkout_url: str = "",
        to_phone: str = ""
    ) -> Dict[str, Any]:
        """Convenience alias for cart recovery template."""
        target_phone = to_phone or recipient_phone
        items_str = ", ".join(cart_items) if isinstance(cart_items, list) else str(cart_items)
        return await self.send_cart_recovery_button(
            recipient_phone=target_phone,
            customer_name=customer_name,
            cart_items_summary=items_str,
            checkout_url=checkout_url
        )

whatsapp_service = MetaWhatsAppService()
