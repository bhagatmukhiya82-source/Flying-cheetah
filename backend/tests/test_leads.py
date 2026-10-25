import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_submit_valid_lead(client: AsyncClient, admin_token: str):
    lead_payload = {
        "name": "Priya Nair",
        "email": "priya@organicherbals.co",
        "phone": "+91 99201 23456",
        "service_interested": "Hyperlocal 18-min Courier & WhatsApp Commerce",
        "message": "We need to connect Shopify store with Borzo hyperlocal delivery in Mumbai.",
        "source_page": "feel-dispatch"
    }

    # 1. Ingest lead
    resp = await client.post("/api/v1/leads", json=lead_payload)
    assert resp.status_code == 201
    lead_data = resp.json()
    assert lead_data["email"] == lead_payload["email"]
    assert lead_data["status"] == "new"
    lead_id = lead_data["id"]

    # 2. Query as Admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    admin_list_resp = await client.get("/api/v1/leads", headers=headers)
    assert admin_list_resp.status_code == 200
    leads = admin_list_resp.json()["items"]
    assert any(l["id"] == lead_id for l in leads)

    # 3. Patch lead status
    patch_resp = await client.patch(
        f"/api/v1/leads/{lead_id}",
        json={"status": "contacted"},
        headers=headers
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "contacted"

@pytest.mark.asyncio
async def test_honeypot_spam_filtering(client: AsyncClient):
    bot_payload = {
        "name": "Spam Bot",
        "email": "spambot@malicious-sender.com",
        "phone": "+1 555 0199",
        "service_interested": "SEO",
        "message": "Buy cheap backlinks now",
        "_hp_security_code": "bot_detected_text" # Honeypot triggered
    }

    resp = await client.post("/api/v1/leads", json=bot_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"] == "bot-rejected"
