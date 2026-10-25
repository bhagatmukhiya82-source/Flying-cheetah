import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_book_demo_and_admin_manage(client: AsyncClient, admin_token: str):
    demo_payload = {
        "name": "Ananya Singhal",
        "email": "ananya@couturebotanics.in",
        "phone": "+91 98205 67890",
        "company": "Couture Botanics Mumbai",
        "modules": ["18-Min Hyperlocal Logistics", "WhatsApp Shopping Cart"],
        "notes": "Looking to replace our existing manual COD calling team."
    }

    # 1. Book demo
    resp = await client.post("/api/v1/demos/book", json=demo_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == demo_payload["name"]
    assert data["company"] == demo_payload["company"]
    assert data["status"] == "confirmed"
    demo_id = data["id"]

    # 2. List demos as Admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    list_resp = await client.get("/api/v1/demos", headers=headers)
    assert list_resp.status_code == 200
    demos = list_resp.json()
    assert any(d["id"] == demo_id for d in demos)

    # 3. Patch demo status
    patch_resp = await client.patch(
        f"/api/v1/demos/{demo_id}/status?status_update=attended",
        headers=headers
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "attended"
