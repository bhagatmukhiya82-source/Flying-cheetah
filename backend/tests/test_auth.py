import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "flying-cheetah-backend"

@pytest.mark.asyncio
async def test_register_trial_and_login(client: AsyncClient):
    payload = {
        "full_name": "Karan Malhotra",
        "email": "karan@mumbaicouture.in",
        "phone": "+91 98200 88776",
        "password": "Password123!",
        "store_url": "https://mumbaicouture.in"
    }

    # 1. Register trial
    reg_resp = await client.post("/api/v1/auth/register-trial", json=payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == payload["email"]
    assert reg_data["user"]["trial_days_left"] == 14

    # 2. Login with credentials
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data

    # 3. Access /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {login_data['access_token']}"}
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == payload["email"]
