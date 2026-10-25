import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_fleet_dispatch_and_track(client: AsyncClient):
    payload = {
        "order_ref": "FC-MUM-FLEET-88",
        "courier": "borzo",
        "pickup_address": {
            "address": "Linking Road, Bandra West, Mumbai 400050",
            "contact_name": "FC Hub Bandra",
            "contact_phone": "+91 98200 99887"
        },
        "delivery_address": {
            "address": "Worli Sea Face, Mumbai 400018",
            "contact_name": "Rohan Jhaveri",
            "contact_phone": "+91 98199 44332"
        },
        "package_description": "Luxury Silk Scarf",
        "package_weight_kg": 0.8
    }

    # Dispatch
    disp_resp = await client.post("/api/v1/fleet/dispatch", json=payload)
    assert disp_resp.status_code == 201
    disp_data = disp_resp.json()
    assert disp_data["order_ref"] == payload["order_ref"]
    assert disp_data["courier"] == "borzo"
    assert disp_data["eta_minutes"] == 18
    assert disp_data["status"] == "rider_assigned"
    assert disp_data["rider_name"] is not None

    # Track
    track_resp = await client.get(f"/api/v1/fleet/track/{payload['order_ref']}")
    assert track_resp.status_code == 200
    track_data = track_resp.json()
    assert track_data["order_ref"] == payload["order_ref"]
    assert track_data["rider_name"] == disp_data["rider_name"]
