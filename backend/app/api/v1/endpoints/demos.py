from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import Profile
from app.models.demo import DemoBooking
from app.schemas.demo_schema import DemoBookingCreate, DemoBookingResponse
from app.services.email_service import email_service
from app.services.meta_whatsapp import whatsapp_service

router = APIRouter()

@router.post("/book", response_model=DemoBookingResponse, status_code=status.HTTP_201_CREATED)
async def book_demo(
    payload: DemoBookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Public Demo Booking Endpoint.
    Stores booking, dispatches email alert to flyingcheetah.agency@gmail.com,
    triggers n8n webhook, and sends WhatsApp confirmation to the client.
    """
    # Honeypot spam protection
    if payload.honeypot:
        # Silent synthetic success for automated bots
        return DemoBookingResponse(
            id="hp-filtered",
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            company=payload.company,
            modules=payload.modules,
            scheduled_time=payload.scheduled_time or datetime.now(timezone.utc),
            status="confirmed",
            notes=payload.notes,
            created_at=datetime.now(timezone.utc)
        )

    scheduled = payload.scheduled_time or datetime.now(timezone.utc)

    booking = DemoBooking(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        company=payload.company.strip(),
        modules=payload.modules,
        scheduled_time=scheduled,
        status="confirmed",
        notes=payload.notes
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Queue background alerts
    background_tasks.add_task(
        email_service.send_demo_alert,
        name=booking.name,
        email=booking.email,
        phone=booking.phone,
        company=booking.company,
        modules=booking.modules,
        scheduled_time=str(booking.scheduled_time)
    )

    # Queue prospect WhatsApp confirmation
    wa_msg = (
        f"Hi {booking.name}! 🚀 Your Flying Cheetah Labs demo for {booking.company} is confirmed.\n\n"
        f"📅 Date/Time: {booking.scheduled_time.strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"⚡ Modules: {', '.join(booking.modules) if booking.modules else 'Complete AI Suite'}\n\n"
        f"Our Solution Architect will call you on {booking.phone}."
    )
    background_tasks.add_task(
        whatsapp_service.send_text_message,
        to_phone=booking.phone,
        body=wa_msg
    )

    return booking

@router.get("", response_model=List[DemoBookingResponse])
async def list_demos(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: Profile = Depends(require_admin)
):
    """
    [Admin Guarded] Retrieve list of scheduled and historical demos.
    """
    query = select(DemoBooking).order_by(desc(DemoBooking.scheduled_time)).offset(offset).limit(limit)
    if status_filter:
        query = query.where(DemoBooking.status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{booking_id}/status", response_model=DemoBookingResponse)
async def update_demo_status(
    booking_id: str,
    status_update: str = Query(..., pattern="^(confirmed|attended|cancelled|rescheduled)$"),
    db: AsyncSession = Depends(get_db),
    admin_user: Profile = Depends(require_admin)
):
    """
    [Admin Guarded] Update the execution status of a scheduled demo.
    """
    query = select(DemoBooking).where(DemoBooking.id == booking_id)
    result = await db.execute(query)
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Demo booking record not found")

    booking.status = status_update
    await db.commit()
    await db.refresh(booking)
    return booking
