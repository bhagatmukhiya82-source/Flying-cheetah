import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("flyingcheetah.ws")

class ConnectionManager:
    def __init__(self):
        self.inbox_connections: List[WebSocket] = []
        self.telemetry_connections: List[WebSocket] = []

    # Inbox Chat Connections
    async def connect_inbox(self, websocket: WebSocket):
        await websocket.accept()
        self.inbox_connections.append(websocket)
        logger.info(f"Inbox WS connected. Total active: {len(self.inbox_connections)}")

    def disconnect_inbox(self, websocket: WebSocket):
        if websocket in self.inbox_connections:
            self.inbox_connections.remove(websocket)
            logger.info(f"Inbox WS disconnected. Total active: {len(self.inbox_connections)}")

    async def broadcast_inbox(self, message: Dict[str, Any]):
        dead_connections = []
        payload = json.dumps(message)
        for ws in self.inbox_connections:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting to inbox socket: {e}")
                dead_connections.append(ws)
        for dead in dead_connections:
            self.disconnect_inbox(dead)

    # Telemetry & GPS Tracking Connections
    async def connect_telemetry(self, websocket: WebSocket):
        await websocket.accept()
        self.telemetry_connections.append(websocket)
        logger.info(f"Telemetry WS connected. Total active: {len(self.telemetry_connections)}")

    def disconnect_telemetry(self, websocket: WebSocket):
        if websocket in self.telemetry_connections:
            self.telemetry_connections.remove(websocket)
            logger.info(f"Telemetry WS disconnected. Total active: {len(self.telemetry_connections)}")

    async def broadcast_telemetry(self, event: Dict[str, Any]):
        dead_connections = []
        payload = json.dumps(event)
        for ws in self.telemetry_connections:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting to telemetry socket: {e}")
                dead_connections.append(ws)
        for dead in dead_connections:
            self.disconnect_telemetry(dead)

ws_manager = ConnectionManager()
