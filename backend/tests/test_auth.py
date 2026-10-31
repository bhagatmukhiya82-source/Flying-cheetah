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

@pytest.mark.asyncio
async def test_forgot_password_otp_and_reset(client: AsyncClient):
    email = "pilot.reset@mumbaibrand.in"
    
    # 1. Register account
    await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Reset Test User",
        "email": email,
        "phone": "+91 99887 66554",
        "password": "InitialPassword123!"
    })

    # 2. Request OTP for forgot password
    forgot_resp = await client.post("/api/v1/auth/forgot-password", json={
        "email": email,
        "phone": "+91 99887 66554"
    })
    assert forgot_resp.status_code == 200
    forgot_data = forgot_resp.json()
    assert forgot_data["success"] is True
    otp_code = forgot_data["otp"]
    assert len(otp_code) == 6

    # 3. Verify OTP code
    verify_resp = await client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "otp": otp_code
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["valid"] is True

    # 4. Set new password
    reset_resp = await client.post("/api/v1/auth/reset-password", json={
        "email": email,
        "otp": otp_code,
        "new_password": "NewSecurePassword456!"
    })
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert "access_token" in reset_data

    # 5. Sign in with the new password
    new_login_resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "NewSecurePassword456!"
    })
    assert new_login_resp.status_code == 200

@pytest.mark.asyncio
async def test_update_merchant_profile(client: AsyncClient):
    email = "merchant.profile@boutique.in"
    reg_resp = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Merchant Founder",
        "email": email,
        "phone": "+91 98203 11223",
        "password": "SecurePassword123!"
    })
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update rich merchant details
    profile_payload = {
        "business_name": "Mumbai Couture & Luxury Silks",
        "category_niche": "Apparel & Fashion",
        "gstin_udyam": "27AAACF1234M1Z5",
        "whatsapp_support": "+91 99203 86421",
        "pickup_address": "Shop 4, Ground Floor, Opera House, Charni Road, Mumbai 400004",
        "merchant_upi_id": "mumbaicouture@okhdfcbank",
        "delivery_radius_km": 25
    }
    update_resp = await client.put("/api/v1/auth/profile", json=profile_payload, headers=headers)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["business_name"] == profile_payload["business_name"]
    assert updated_data["category_niche"] == profile_payload["category_niche"]
    assert updated_data["gstin_udyam"] == profile_payload["gstin_udyam"]
    assert updated_data["whatsapp_support"] == profile_payload["whatsapp_support"]
    assert updated_data["pickup_address"] == profile_payload["pickup_address"]
    assert updated_data["merchant_upi_id"] == profile_payload["merchant_upi_id"]
    assert updated_data["delivery_radius_km"] == 25

    # Verify /me returns new details
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["business_name"] == profile_payload["business_name"]

@pytest.mark.asyncio
async def test_update_merchant_profile_unauthorized_and_partial(client: AsyncClient):
    # 1. Unauthorized attempt without token
    unauth_resp = await client.put("/api/v1/auth/profile", json={"business_name": "Hack Attempt"})
    assert unauth_resp.status_code == 401

    # 2. Register fresh merchant
    email = "partial.merchant@boutique.in"
    reg_resp = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Partial Founder",
        "email": email,
        "phone": "+91 98200 99887",
        "password": "Password789!"
    })
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Partial update (business name and delivery radius only)
    partial_payload = {
        "business_name": "Express Electronics Hub",
        "delivery_radius_km": 50
    }
    update_resp = await client.put("/api/v1/auth/profile", json=partial_payload, headers=headers)
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["business_name"] == "Express Electronics Hub"
    assert data["delivery_radius_km"] == 50

    # 4. GET /profile endpoint returns same data as /me
    prof_resp = await client.get("/api/v1/auth/profile", headers=headers)
    assert prof_resp.status_code == 200
    assert prof_resp.json()["business_name"] == "Express Electronics Hub"
    assert prof_resp.json()["delivery_radius_km"] == 50

    # 5. Subsequent partial update omitting delivery_radius_km must NOT reset it to default 15
    name_only_update = {
        "business_name": "Express Electronics & Drone Hub"
    }
    update2_resp = await client.put("/api/v1/auth/profile", json=name_only_update, headers=headers)
    assert update2_resp.status_code == 200
    data2 = update2_resp.json()
    assert data2["business_name"] == "Express Electronics & Drone Hub"
    assert data2["delivery_radius_km"] == 50, "delivery_radius_km should remain 50 and not be clobbered to 15!"

@pytest.mark.asyncio
async def test_phone_uniqueness_enforcement_on_registration(client: AsyncClient):
    # 1. Register User 1 with Indian formatted phone
    phone_raw = "+91 98200 44556"
    resp1 = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Account One",
        "email": "user1.unique@brand.in",
        "phone": phone_raw,
        "password": "Password123!"
    })
    assert resp1.status_code == 201

    # 2. Attempt to register User 2 with same phone in local format (09820044556)
    resp2 = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Account Two",
        "email": "user2.conflict@brand.in",
        "phone": "09820044556",
        "password": "Password456!"
    })
    assert resp2.status_code == 400
    assert "already linked to an existing account" in resp2.json()["detail"]

    # 3. Attempt to register User 3 with same phone in 10-digit format (9820044556)
    resp3 = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Account Three",
        "email": "user3.conflict@brand.in",
        "phone": "9820044556",
        "password": "Password789!"
    })
    # 4. Attempt to register User 4 with same phone with trunk 0 (+91 098200 44556)
    resp4 = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Account Four",
        "email": "user4.conflict@brand.in",
        "phone": "+91 098200 44556",
        "password": "Password000!"
    })
    assert resp4.status_code == 400
    assert "already linked to an existing account" in resp4.json()["detail"]

    # 5. Attempt to register User 5 with parenthesized trunk 0 (+91 (0) 98200 44556)
    resp5 = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Account Five",
        "email": "user5.conflict@brand.in",
        "phone": "+91 (0) 98200 44556",
        "password": "Password111!"
    })
    assert resp5.status_code == 400
    assert "already linked to an existing account" in resp5.json()["detail"]

    # 6. Attempt to register with invalid/too short phone format (Pydantic schema validation)
    resp_short = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Short Phone User",
        "email": "user.short@brand.in",
        "phone": "12345",
        "password": "Password123!"
    })
    assert resp_short.status_code == 422

    # 7. Attempt to register with non-phone string (business logic validation)
    resp_invalid = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Invalid Phone User",
        "email": "user.invalid@brand.in",
        "phone": "invalidphone77",
        "password": "Password123!"
    })
    assert resp_invalid.status_code == 400
    assert "Please provide a valid phone number" in resp_invalid.json()["detail"]

    # 8. Attempt to register with invalid Indian mobile prefix starting with 1
    resp_bad_prefix = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Bad Prefix User",
        "email": "user.badprefix@brand.in",
        "phone": "+91 12345 67890",
        "password": "Password123!"
    })
    assert resp_bad_prefix.status_code == 400
    assert "Please provide a valid phone number" in resp_bad_prefix.json()["detail"]

@pytest.mark.asyncio
async def test_phone_uniqueness_enforcement_on_profile_update(client: AsyncClient):
    # 1. User A registration
    reg_a = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Merchant Alpha",
        "email": "alpha.phone@store.in",
        "phone": "+91 98201 11222",
        "password": "Password123!"
    })
    assert reg_a.status_code == 201
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. User B registration
    reg_b = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Merchant Beta",
        "email": "beta.phone@store.in",
        "phone": "+91 98202 33444",
        "password": "Password123!"
    })
    assert reg_b.status_code == 201
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User B attempts to update their phone to User A's phone (+91 98201 11222)
    conflict_update = await client.put("/api/v1/auth/profile", json={
        "phone": "+91 98201 11222"
    }, headers=headers_b)
    assert conflict_update.status_code == 400
    assert "already linked to an existing account" in conflict_update.json()["detail"]

    # 4. User B attempts to update their whatsapp_support to User A's phone
    conflict_wa = await client.put("/api/v1/auth/profile", json={
        "whatsapp_support": "9820111222"
    }, headers=headers_b)
    assert conflict_wa.status_code == 400
    assert "already linked to an existing account" in conflict_wa.json()["detail"]

    # 5. User A updating their own profile with their own phone succeeds
    self_update = await client.put("/api/v1/auth/profile", json={
        "business_name": "Alpha Boutique",
        "phone": "+91 98201 11222"
    }, headers=headers_a)
    assert self_update.status_code == 200
    assert self_update.json()["business_name"] == "Alpha Boutique"

@pytest.mark.asyncio
async def test_google_oauth_reconciliation_preserves_phone_and_profile(client: AsyncClient):
    email = "founder.reconcile@brand.in"
    phone = "+91 98209 87654"

    # 1. Register with email/password and set merchant profile
    reg_resp = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Original Founder",
        "email": email,
        "phone": phone,
        "password": "SecurePassword123!"
    })
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["user"]["id"]
    token = reg_resp.json()["access_token"]

    # Update rich merchant profile
    await client.put("/api/v1/auth/profile", json={
        "business_name": "Reconciled Artisans",
        "category_niche": "Handmade Gifts",
        "pickup_address": "404 Colaba Causeway, Mumbai 400005",
        "merchant_upi_id": "reconciled@okhdfcbank"
    }, headers={"Authorization": f"Bearer {token}"})

    # 2. Later, sign in via Google OAuth callback with the same email
    google_resp = await client.post("/api/v1/auth/google-callback", json={
        "email": email,
        "name": "Original Founder Google",
        "avatar_url": "https://lh3.googleusercontent.com/a/mock-avatar-123"
    })
    assert google_resp.status_code == 200
    google_data = google_resp.json()

    # 3. Verify single reconciled account identity
    assert google_data["user"]["id"] == user_id, "User ID must match existing account; no duplicate records!"
    assert google_data["user"]["email"] == email
    # Verify phone and operational profile are preserved
    assert google_data["user"]["phone"] == "+919820987654"
    assert google_data["user"]["business_name"] == "Reconciled Artisans"
    assert google_data["user"]["category_niche"] == "Handmade Gifts"
    assert google_data["user"]["pickup_address"] == "404 Colaba Causeway, Mumbai 400005"
    assert google_data["user"]["merchant_upi_id"] == "reconciled@okhdfcbank"
    assert google_data["user"]["avatar_url"] == "https://lh3.googleusercontent.com/a/mock-avatar-123"

@pytest.mark.asyncio
async def test_authenticated_change_password(client: AsyncClient):
    email = "changepass.test@brand.in"
    old_pass = "InitialPass123!"
    new_pass = "NewPass456!"

    # 1. Register user
    reg = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Change Pass User",
        "email": email,
        "phone": "+91 98208 77665",
        "password": old_pass
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Attempt change password with wrong current password
    wrong_curr = await client.post("/api/v1/auth/change-password", json={
        "current_password": "WrongPassword999!",
        "new_password": new_pass
    }, headers=headers)
    assert wrong_curr.status_code == 400
    assert "Current password does not match" in wrong_curr.json()["detail"]

    # 3. Change password with correct current password
    change_resp = await client.post("/api/v1/auth/change-password", json={
        "current_password": old_pass,
        "new_password": new_pass
    }, headers=headers)
    assert change_resp.status_code == 200
    assert change_resp.json()["success"] is True

    # 4. Old password login should fail
    old_login = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": old_pass
    })
    assert old_login.status_code == 401

    # 5. New password login should succeed
    new_login = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": new_pass
    })
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()

@pytest.mark.asyncio
async def test_login_with_phone_identifier(client: AsyncClient):
    email = "phone.login@brand.in"
    phone = "+91 98205 55667"
    password = "SecretPassword123!"

    # 1. Register user
    reg = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Phone Login Founder",
        "email": email,
        "phone": phone,
        "password": password
    })
    assert reg.status_code == 201

    # 2. Login with phone formatted with country code and spaces
    login_phone_resp = await client.post("/api/v1/auth/login", json={
        "email": phone,
        "password": password
    })
    assert login_phone_resp.status_code == 200
    phone_data = login_phone_resp.json()
    assert "access_token" in phone_data
    assert phone_data["user"]["email"] == email

    # 3. Login with 10-digit raw phone number
    login_10digit_resp = await client.post("/api/v1/auth/login", json={
        "email": "9820555667",
        "password": password
    })
    assert login_10digit_resp.status_code == 200
    assert login_10digit_resp.json()["user"]["email"] == email

    # 4. Login with wrong password using phone
    wrong_pass_resp = await client.post("/api/v1/auth/login", json={
        "email": phone,
        "password": "WrongPassword999!"
    })
    assert wrong_pass_resp.status_code == 401

@pytest.mark.asyncio
async def test_profile_synchronization_phone_and_whatsapp(client: AsyncClient):
    email = "sync.contact@brand.in"
    phone_initial = "+91 98206 11223"
    password = "SecurePassword123!"

    # 1. Register account
    reg = await client.post("/api/v1/auth/register-trial", json={
        "full_name": "Sync Contact Founder",
        "email": email,
        "phone": phone_initial,
        "password": password
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update phone only -> verify both phone and whatsapp_support are updated
    update_phone_resp = await client.put("/api/v1/auth/profile", json={
        "phone": "+91 98207 33445"
    }, headers=headers)
    assert update_phone_resp.status_code == 200
    p_data = update_phone_resp.json()
    assert p_data["phone"] == "+919820733445"
    assert "+91 98207 33445" in p_data["whatsapp_support"]

    # 3. Update whatsapp_support only -> verify phone is updated to canonical E.164
    update_wa_resp = await client.put("/api/v1/auth/profile", json={
        "whatsapp_support": "+91 98208 55667"
    }, headers=headers)
    assert update_wa_resp.status_code == 200
    wa_data = update_wa_resp.json()
    assert wa_data["phone"] == "+919820855667"
    assert "+91 98208 55667" in wa_data["whatsapp_support"]



