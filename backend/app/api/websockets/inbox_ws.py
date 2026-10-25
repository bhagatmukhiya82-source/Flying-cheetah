import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.websockets.manager import ws_manager
from app.core.database import async_session_factory
from app.models.message import OmnichannelMessage
from app.services.meta_whatsapp import whatsapp_service

logger = logging.getLogger("flyingcheetah.inbox_ws")
router = APIRouter()

@router.websocket("/ws/inbox")
async def websocket_inbox_endpoint(websocket: WebSocket):
    """
    Live Omnichannel Support Desk WebSocket.
    Allows support agents to receive real-time incoming messages from WhatsApp,
    Instagram, RCS, WebChat, and reply to customers in real time.
    """
    await ws_manager.connect_inbox(websocket)
    try:
        # Send initial handshake message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "Connected to Flying Cheetah Omnichannel Inbox",
            "status": "ready"
        }))

        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
                action = data.get("action")

                if action == "send_reply":
                    channel = data.get("channel", "whatsapp")
                    recipient_id = data.get("recipient_id") # e.g. "+91 98765 43210"
                    content = data.get("content", "")
                    conversation_id = data.get("conversation_id", recipient_id)

                    # Persist outbound message in database
                    async with async_session_factory() as db:
                        msg = OmnichannelMessage(
                            conversation_id=conversation_id,
                            channel=channel,
                            direction="outbound",
                            sender_id="support_agent",
                            recipient_id=recipient_id,
                            content=content,
                            status="sent"
                        )
                        db.add(msg)
                        await db.commit()
                        await db.refresh(msg)

                    # Dispatch via channel driver
                    if channel == "whatsapp":
                        await whatsapp_service.send_text_message(
                            to_phone=recipient_id,
                            body=content
                        )

                    # Broadcast confirmation to all agent screens
                    await ws_manager.broadcast_inbox({
                        "type": "new_message",
                        "direction": "outbound",
                        "channel": channel,
                        "conversation_id": conversation_id,
                        "content": content,
                        "sender_id": "support_agent",
                        "status": "sent"
                    })

                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

            except json.JSONDecodeError:
                logger.warning(f"Malformed WS payload: {raw_data}")
            except Exception as e:
                logger.error(f"Error handling inbox message: {e}")

    except WebSocketDisconnect:
        ws_manager.disconnect_inbox(websocket)
