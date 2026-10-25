import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select

from app.workers.celery_app import celery_app
from app.core.database import async_session_factory
from app.models.user import Profile
from app.services.meta_whatsapp import whatsapp_service

logger = logging.getLogger("trial_expiry_worker")

async def _async_check_trial_expirations():
    logger.info("[Trial Expiry Worker] Scanning active accounts for trial status updates...")
    reminders_sent = 0
    expired_count = 0

    async with async_session_factory() as session:
        query = select(Profile).where(Profile.trial_active == True)
        res = await session.execute(query)
        profiles = res.scalars().all()

        now = datetime.now(timezone.utc)
        for profile in profiles:
            elapsed_days = (now - profile.trial_started_at.replace(tzinfo=timezone.utc if profile.trial_started_at.tzinfo is None else profile.trial_started_at.tzinfo)).days
            remaining = max(0, 14 - elapsed_days)
            profile.trial_days_left = remaining

            if remaining == 0:
                profile.trial_active = False
                expired_count += 1
                logger.info(f"Trial expired for {profile.email}")

            elif remaining in [1, 2, 3] and profile.phone:
                # Dispatch WhatsApp renewal reminder
                msg_body = (
                    f"⚡ Flying Cheetah Labs: Hi {profile.full_name}, your 14-day autonomous AI commerce trial "
                    f"expires in {remaining} day(s)! To keep your 18-minute Mumbai dispatch, AI Voice agents, "
                    f"and WhatsApp cart recovery running uninterrupted, renew your plan: https://flyingcheetah.agency/pricing"
                )
                try:
                    await whatsapp_service.send_text_message(
                        to_phone=profile.phone,
                        body=msg_body
                    )
                    reminders_sent += 1
                except Exception as e:
                    logger.warning(f"Failed to send trial reminder to {profile.phone}: {e}")

        await session.commit()

    logger.info(f"[Trial Expiry Worker] Completed run: {reminders_sent} WhatsApp reminders sent, {expired_count} expired.")
    return {"reminders_sent": reminders_sent, "expired_count": expired_count}

@celery_app.task(name="app.workers.trial_expiry_worker.check_trial_expirations")
def check_trial_expirations():
    """
    14-Day Trial Expiry Worker.
    Daily cron scanning trial status, updating remaining days, and dispatching WhatsApp reminder alerts.
    """
    return asyncio.run(_async_check_trial_expirations())
