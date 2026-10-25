import logging
import httpx
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("meta_instagram")

class MetaInstagramService:
    def __init__(self):
        self.version = settings.META_GRAPH_VERSION
        self.token = settings.META_WA_TOKEN # Shares Graph API token with Instagram Messaging permission
        self.account_id = settings.META_IG_ACCOUNT_ID
        self.is_mock = self.token.startswith("MOCK") or "xyzcompany" in self.token

    async def reply_to_comment(self, comment_id: str, message: str) -> Dict[str, Any]:
        """Auto-replies to a public Reel comment in <2 seconds."""
        if self.is_mock:
            logger.info(f"[Mock IG] Public reply to comment {comment_id}: '{message}'")
            return {"id": f"comment_reply_mock_{comment_id}"}

        url = f"https://graph.facebook.com/{self.version}/{comment_id}/replies"
        payload = {"message": message}
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def send_direct_message(self, ig_user_scoped_id: str, message: str, action_url: str = None) -> Dict[str, Any]:
        """Sends private direct message into user's Instagram DM."""
        if self.is_mock:
            logger.info(f"[Mock IG] DM sent to {ig_user_scoped_id}: '{message}' (Action URL: {action_url})")
            return {"recipient_id": ig_user_scoped_id, "message_id": f"mid.mock_ig_{ig_user_scoped_id}"}

        url = f"https://graph.facebook.com/{self.version}/me/messages"
        payload = {
            "recipient": {"id": ig_user_scoped_id},
            "message": {"text": message}
        }
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

instagram_service = MetaInstagramService()
