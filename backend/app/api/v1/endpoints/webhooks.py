import json
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, status, Query, Header, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, async_session_factory
from app.core.security import verify_meta_signature, verify_razorpay_signature
from app.models.message import OmnichannelMessage
from app.models.fleet import FleetOrder
from app.models.payment import PaymentTransaction
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

@router.post("/razorpay")
async def receive_razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives incoming Razorpay payment events (payment.captured, payment.failed, order.paid).
    Verifies HMAC SHA-256 signature, records to payments_transactions, and updates order fulfillment.
    """
    raw_body = await request.body()
    if not verify_razorpay_signature(raw_body, x_razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Razorpay webhook signature"
        )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})

    order_ref = payment_entity.get("notes", {}).get("order_ref") or order_entity.get("receipt") or "FC-DIRECT"
    payment_id = payment_entity.get("id") or f"pay_{uuid.uuid4().hex[:10]}"
    amount = float(payment_entity.get("amount", 0)) / 100.0 if payment_entity.get("amount") else 0.0
    status_str = "captured" if event == "payment.captured" else ("failed" if "failed" in event else "authorized")
    method = payment_entity.get("method", "upi")
    customer_phone = payment_entity.get("contact") or payment_entity.get("notes", {}).get("customer_phone", "")
    customer_email = payment_entity.get("email") or payment_entity.get("notes", {}).get("customer_email", "")

    # Save transaction in DB
    trx = PaymentTransaction(
        order_ref=order_ref,
        payment_gateway="razorpay",
        gateway_order_id=payment_entity.get("order_id") or order_entity.get("id"),
        gateway_payment_id=payment_id,
        amount_inr=amount,
        currency=payment_entity.get("currency", "INR"),
        status=status_str,
        method=method,
        customer_email=customer_email,
        customer_phone=customer_phone,
        raw_webhook_payload=payload
    )
    db.add(trx)
    await db.commit()

    # If captured, dispatch customer confirmation on WhatsApp
    if status_str == "captured" and customer_phone:
        receipt_text = (
            f"🐆 *FLYING CHEETAH LABS - PAYMENT CONFIRMED*\n\n"
            f"✅ Received *₹{amount:,.2f}* for Ref: *{order_ref}* via {method.upper()}.\n"
            f"⚡ Mumbai 18-minute hyperlocal dispatch is processing.\n"
            f"Live Tracking: https://flying-cheetah.vercel.app/delivery.html"
        )
        background_tasks.add_task(
            whatsapp_service.send_text_message,
            to_phone=customer_phone,
            body=receipt_text
        )

    # Broadcast to Telemetry & Admin Inbox
    background_tasks.add_task(
        ws_manager.broadcast_telemetry,
        {
            "type": "payment_received",
            "order_ref": order_ref,
            "amount": amount,
            "status": status_str,
            "gateway": "razorpay"
        }
    )

    return {"status": "success", "event": event, "payment_id": payment_id}

@router.post("/borzo-status")
async def receive_borzo_status_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives Borzo courier status changes (courier_assigned, picked_up, delivered, cancelled).
    Updates fleet_orders and broadcasts live telemetry.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    order_id = str(payload.get("order_id", ""))
    order_status = payload.get("status", "")
    rider = payload.get("courier", {})
    tracking_url = payload.get("tracking_url", "")

    query = select(FleetOrder).where(
        (FleetOrder.courier_order_id == order_id) | 
        (FleetOrder.order_ref == payload.get("client_order_id", ""))
    )
    result = await db.execute(query)
    fleet_order = result.scalar_one_or_none()

    if fleet_order:
        status_map = {
            "planned": "assigning",
            "courier_assigned": "rider_assigned",
            "active": "in_transit",
            "completed": "delivered",
            "canceled": "cancelled"
        }
        fleet_order.status = status_map.get(order_status, order_status)
        if tracking_url:
            fleet_order.tracking_url = tracking_url
        if rider.get("name"):
            fleet_order.rider_name = rider.get("name")
        if rider.get("phone"):
            fleet_order.rider_phone = rider.get("phone")
        
        await db.commit()
        await db.refresh(fleet_order)

        background_tasks.add_task(
            ws_manager.broadcast_telemetry,
            {
                "type": "order_status_update",
                "order_ref": fleet_order.order_ref,
                "status": fleet_order.status,
                "rider_name": fleet_order.rider_name,
                "rider_phone": fleet_order.rider_phone,
                "tracking_url": fleet_order.tracking_url
            }
        )

    return {"status": "success", "order_id": order_id, "processed_status": order_status}

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
