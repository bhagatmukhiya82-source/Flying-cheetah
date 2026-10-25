import pytest
import asyncio
from app.core.database import init_db
from app.workers.cart_recovery_worker import send_abandoned_cart_recovery
from app.workers.cod_verification_worker import trigger_automated_cod_verification
from app.workers.trial_expiry_worker import check_trial_expirations

@pytest.fixture(autouse=True)
def setup_worker_database():
    asyncio.run(init_db())

def test_abandoned_cart_recovery_worker():
    res = send_abandoned_cart_recovery(
        customer_phone="+91 98200 77665",
        customer_name="Aarav Sharma",
        cart_items=["Artisan Roasted Coffee Beans (500g)", "Pour-Over Ceramic Dripper"],
        recovery_url="https://flyingcheetah.agency/checkout?recovery=tok_123",
        total_inr=1890.00
    )
    assert res is not None
    assert res.get("is_successful") is True

def test_cod_verification_worker():
    res = trigger_automated_cod_verification(
        phone="+91 98200 99443",
        customer_name="Pooja Merchant",
        order_ref="ORD-FC-WORKER-99",
        amount_inr=2499.00,
        items_summary="Organic Raw Honey 1kg"
    )
    assert res is not None
    assert "call_sid" in res
    assert res.get("status") == "initiated"

def test_trial_expiry_worker():
    res = check_trial_expirations()
    assert res is not None
    assert "reminders_sent" in res
    assert "expired_count" in res
