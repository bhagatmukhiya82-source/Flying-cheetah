import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_meta_whatsapp_verification_challenge(client: AsyncClient):
    # Valid handshake
    token = settings.META_WEBHOOK_VERIFY_TOKEN
    resp = await client.get(
        f"/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge_code_9988&hub.verify_token={token}"
    )
    assert resp.status_code == 200
    assert resp.text == "test_challenge_code_9988"

    # Invalid token handshake
    fail_resp = await client.get(
        "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge_code_9988&hub.verify_token=wrong_token"
    )
    assert fail_resp.status_code == 403

@pytest.mark.asyncio
async def test_courier_gps_webhook(client: AsyncClient, admin_token: str):
    # First dispatch a courier order
    dispatch_payload = {
        "order_ref": "FC-TEST-GPS-01",
        "courier": "borzo",
        "pickup_address": {"address": "Bandra Kurla Complex", "contact_phone": "+91 98200 11223"},
        "delivery_address": {"address": "Lower Parel", "contact_phone": "+91 98111 22334"}
    }
    disp_res = await client.post("/api/v1/fleet/dispatch", json=dispatch_payload)
    assert disp_res.status_code == 201

    # Now post courier GPS webhook
    gps_payload = {
        "order_ref": "FC-TEST-GPS-01",
        "courier": "borzo",
        "rider_name": "Deepak Verma",
        "rider_phone": "+91 98980 12345",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "eta_minutes": 11,
        "status": "in_transit"
    }
    gps_res = await client.post("/api/v1/webhooks/courier-gps", json=gps_payload)
    assert gps_res.status_code == 200
    assert gps_res.json()["status"] == "updated"
    assert gps_res.json()["eta_minutes"] == 11
