import os
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "flying_cheetah_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.cart_recovery_worker",
        "app.workers.cod_verification_worker",
        "app.workers.trial_expiry_worker",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300, # 5 min max
    beat_schedule={
        "daily-trial-expiry-check": {
            "task": "app.workers.trial_expiry_worker.check_trial_expirations",
            "schedule": 86400.0, # Run once every 24 hours
        },
    }
)
