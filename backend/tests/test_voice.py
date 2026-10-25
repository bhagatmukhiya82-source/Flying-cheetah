import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_voice_call_trigger_and_twiml_callback(client: AsyncClient, admin_token: str):
    voice_payload = {
        "phone": "+91 98200 11889",
        "order_ref": "ORD-MUM-4455",
        "customer_name": "Meera Kapoor",
        "call_type": "cod_verification",
        "amount_inr": 3499.00,
        "items_summary": "Designer Velvet Kurti Set"
    }

    # 1. Trigger COD voice call
    resp = await client.post("/api/v1/voice/trigger-cod-call", json=voice_payload)
    assert resp.status_code == 201
    call_data = resp.json()
    assert call_data["phone"] == voice_payload["phone"]
    assert call_data["status"] == "initiated"
    call_sid = call_data["call_sid"]

    # 2. Test TwiML callback with affirmative response ("Haan, confirm kar dijiye")
    callback_payload = {
        "CallSid": call_sid,
        "SpeechResult": "Haan, bilkul confirm kar do please",
        "CallDuration": "42"
    }
    twiml_resp = await client.post(
        "/api/v1/voice/twiml-callback",
        data=callback_payload
    )
    assert twiml_resp.status_code == 200
    assert "application/xml" in twiml_resp.headers["content-type"]
    assert "confirm ho gaya hai" in twiml_resp.text

    # 3. Verify intent updated in database
    headers = {"Authorization": f"Bearer {admin_token}"}
    calls_resp = await client.get("/api/v1/voice/calls", headers=headers)
    assert calls_resp.status_code == 200
    calls = calls_resp.json()
    matched = next((c for c in calls if c["call_sid"] == call_sid), None)
    assert matched is not None
    assert matched["intent"] == "confirmed"
    assert matched["status"] == "completed"
