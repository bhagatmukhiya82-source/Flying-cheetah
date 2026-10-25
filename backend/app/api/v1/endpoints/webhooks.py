import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, status, Query, Header, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, async_session_factory
from app.core.security import verify_meta_signature
from app.models.message import OmnichannelMessage
from app.models.fleet import FleetOrder
from app.schemas.webhook_schema import CourierGPSPayload
from app.services.meta_whatsapp import whatsapp_service
from app.services.meta_instagram import instagram_service
from app.api.websockets.manager import ws_manager

logger = logging.getLogger("flyingcheetah.webhooks")
router = APIRouter()

@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token")
):
    """
    Meta Graph API Verification Handshake.
    Validates hub.verify_token matches META_WEBHOOK_VERIFY_TOKEN and echoes hub.challenge.
    """
    logger.info(f"Meta WhatsApp Webhook Handshake: mode={hub_mode}, token={hub_verify_token}")
    if hub_mode == "subscribe" and hub_verify_token == settings.META_WEBHOOK_VERIFY_TOKEN:
        return Response(content=hub_challenge or "", media_type="text/plain", status_code=200)
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch or invalid hub.mode"
    )

@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    """
    Receives incoming WhatsApp Cloud API events (messages, button clicks, delivery receipts).
    Verifies HMAC SHA-256 signature, logs to omnichannel_messages, and broadcasts to Inbox WebSocket.
    """
    raw_body = await request.body()
    if not verify_meta_signature(raw_body, x_hub_signature_256 or ""):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid X-Hub-Signature-256 signature"
        )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Extract WhatsApp message details if present
    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            contacts = value.get("contacts", [])

            for msg_item in messages:
                from_phone = msg_item.get("from")
                msg_type = msg_item.get("type", "text")
                msg_id = msg_item.get("id")
                
                content = ""
                if msg_type == "text":
                    content = msg_item.get("text", {}).get("body", "")
                elif msg_type == "interactive":
                    btn_reply = msg_item.get("interactive", {}).get("button_reply", {})
                    content = f"[Button Click]: {btn_reply.get('title')} (ID: {btn_reply.get('id')})"
                else:
                    content = f"[{msg_type} payload]"

                # Persist message to DB in background
                background_tasks.add_task(
                    _save_inbound_message,
                    channel="whatsapp",
                    sender_id=from_phone,
                    recipient_id=settings.META_PHONE_NUMBER_ID,
                    content=content,
                    external_msg_id=msg_id,
                    metadata=msg_item
                )

                # Broadcast to Inbox WebSocket
                background_tasks.add_task(
                    ws_manager.broadcast_inbox,
                    {
                        "type": "new_message",
                        "channel": "whatsapp",
                        "sender_id": from_phone,
                        "content": content,
                        "direction": "inbound",
                        "message_id": msg_id
                    }
                )

                # Auto-reply trigger for catalog inquiries
                if any(k in content.upper() for k in ["DEMO", "PRICE", "HI", "HELLO", "CATALOG", "ORDER"]):
                    reply_text = (
                        f"Namaste! 🙏 Thanks for reaching out to Flying Cheetah Labs.\n\n"
                        f"⚡ 18-min Hyperlocal Mumbai Dispatch is active.\n"
                        f"🤖 Explore AI Commerce: https://flyingcheetah.agency\n\n"
                        f"Reply 'AGENT' to talk to human support or 'DEMO' to book a live sandbox session."
                    )
                    background_tasks.add_task(
                        whatsapp_service.send_text_message,
                        to_phone=from_phone,
                        body=reply_text
                    )

    return {"status": "success", "processed_entries": len(entries)}

@router.post("/instagram")
async def receive_instagram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    """
    Receives Instagram Graph API webhook events (Reel comments, mentions, DMs).
    Automates instantaneous comment replies and direct message dispatch with checkout links.
    """
    raw_body = await request.body()
    if not verify_meta_signature(raw_body, x_hub_signature_256 or ""):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid X-Hub-Signature-256 signature"
        )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            field = change.get("field")
            value = change.get("value", {})

            if field == "comments":
                comment_id = value.get("id")
                comment_text = value.get("text", "")
                ig_user_id = value.get("from", {}).get("id")

                # Auto-reply public comment
                reply_comment = "Check your DM for the instant 1-tap checkout link! 🚀⚡"
                background_tasks.add_task(
                    instagram_service.auto_reply_comment,
                    comment_id=comment_id,
                    reply_text=reply_comment
                )

                # Send private DM with link
                dm_body = (
                    f"Hey! Here is the direct link to the product from our Reel: "
                    f"https://flyingcheetah.agency/demo - Use code SPEED18 for 18-min Mumbai dispatch!"
                )
                background_tasks.add_task(
                    instagram_service.send_direct_message,
                    ig_user_id=ig_user_id,
                    message_text=dm_body
                )

                # Broadcast to inbox WS
                background_tasks.add_task(
                    ws_manager.broadcast_inbox,
                    {
                        "type": "instagram_comment",
                        "comment_id": comment_id,
                        "text": comment_text,
                        "user_id": ig_user_id
                    }
                )

    return {"status": "success", "processed_entries": len(entries)}

@router.post("/courier-gps")
async def receive_courier_gps(
    payload: CourierGPSPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives real-time telemetry updates from Borzo / Porter delivery fleets.
    Updates the rider coordinates, ETA, and broadcasts live to telemetry WebSockets.
    """
    query = select(FleetOrder).where(FleetOrder.order_ref == payload.order_ref)
    result = await db.execute(query)
    fleet_order = result.scalar_one_or_none()

    if not fleet_order:
        raise HTTPException(status_code=404, detail=f"Fleet order '{payload.order_ref}' not found")

    fleet_order.rider_lat = payload.latitude
    fleet_order.rider_lng = payload.longitude
    if payload.eta_minutes is not None:
        fleet_order.eta_minutes = payload.eta_minutes
    if payload.rider_name:
        fleet_order.rider_name = payload.rider_name
    if payload.rider_phone:
        fleet_order.rider_phone = payload.rider_phone
    if payload.status:
        fleet_order.status = payload.status

    await db.commit()
    await db.refresh(fleet_order)

    # Broadcast real-time GPS telemetry to connected map screens
    telemetry_event = {
        "type": "rider_gps_update",
        "order_ref": fleet_order.order_ref,
        "courier": fleet_order.courier,
        "lat": fleet_order.rider_lat,
        "lng": fleet_order.rider_lng,
        "eta_minutes": fleet_order.eta_minutes,
        "status": fleet_order.status,
        "rider_name": fleet_order.rider_name,
        "rider_phone": fleet_order.rider_phone
    }
    background_tasks.add_task(ws_manager.broadcast_telemetry, telemetry_event)

    return {"status": "updated", "order_ref": fleet_order.order_ref, "eta_minutes": fleet_order.eta_minutes}

async def _save_inbound_message(channel: str, sender_id: str, recipient_id: str, content: str, external_msg_id: str, metadata: dict):
    try:
        async with async_session_factory() as session:
            msg = OmnichannelMessage(
                conversation_id=sender_id,
                channel=channel,
                direction="inbound",
                external_message_id=external_msg_id,
                sender_id=sender_id,
                recipient_id=recipient_id,
                content=content,
                status="delivered",
                metadata_json=metadata
            )
            session.add(msg)
            await session.commit()
    except Exception as e:
        logger.error(f"Failed to save inbound omnichannel message: {e}")
