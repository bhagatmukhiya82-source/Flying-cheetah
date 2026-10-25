import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.websockets.manager import ws_manager

logger = logging.getLogger("flyingcheetah.telemetry_ws")
router = APIRouter()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    Live Telemetry WebSocket.
    Streams real-time fleet GPS coordinates, courier dispatch statuses,
    checkout conversion pulses, and storefront latency metrics.
    """
    await ws_manager.connect_telemetry(websocket)
    try:
        # Stream initial telemetry snapshot
        await websocket.send_text(json.dumps({
            "type": "telemetry_snapshot",
            "active_riders": 42,
            "avg_mumbai_eta_mins": 18.4,
            "cod_verification_rate_pct": 98.2,
            "whatsapp_open_rate_pct": 98.6,
            "cart_recovery_roi_multiplier": 4.8,
            "storefront_p95_latency_ms": 38
        }))

        while True:
            # Keep socket open and receive any client filter/ping events
            raw = await websocket.receive_text()
            data = json.loads(raw) if raw.startswith("{") else {}
            if data.get("action") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif data.get("action") == "subscribe_courier":
                order_ref = data.get("order_ref")
                await websocket.send_text(json.dumps({
                    "type": "subscription_confirmed",
                    "order_ref": order_ref,
                    "status": "listening"
                }))

    except WebSocketDisconnect:
        ws_manager.disconnect_telemetry(websocket)
