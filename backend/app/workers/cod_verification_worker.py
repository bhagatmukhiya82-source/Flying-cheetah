import asyncio
import logging
from app.workers.celery_app import celery_app
from app.services.voice_agent import voice_service
from app.core.database import async_session_factory
from app.models.voice import AIVoiceCall

logger = logging.getLogger("cod_verification_worker")

async def _async_trigger_cod_verification(phone: str, customer_name: str, order_ref: str, amount_inr: float, items_summary: str):
    logger.info(f"[COD Verification Worker] Triggering AI voice call to {phone} for order {order_ref} (₹{amount_inr})")
    
    call_res = await voice_service.trigger_cod_verification_call(
        recipient_phone=phone,
        customer_name=customer_name,
        order_ref=order_ref,
        amount_inr=amount_inr,
        items_summary=items_summary
    )

    # Persist in DB
    async with async_session_factory() as session:
        call_record = AIVoiceCall(
            call_sid=call_res["call_sid"],
            phone=phone,
            call_type="cod_verification",
            status="initiated",
            intent="unclear",
            duration_seconds=0,
            transcript=f"Automated 5-minute COD worker verification for order {order_ref}",
            customer_notes=f"Auto-triggered for order {order_ref} by worker"
        )
        session.add(call_record)
        await session.commit()

    return call_res

@celery_app.task(name="app.workers.cod_verification_worker.trigger_automated_cod_verification")
def trigger_automated_cod_verification(phone: str, customer_name: str, order_ref: str, amount_inr: float, items_summary: str = "items"):
    """
    Automated COD Verification Worker.
    Triggers AI Voice agent call to confirm COD order within 5 minutes of placement.
    """
    return asyncio.run(_async_trigger_cod_verification(phone, customer_name, order_ref, amount_inr, items_summary))
