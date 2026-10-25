from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import require_admin
from app.models.lead import LeadInquiry
from app.schemas.lead_schema import LeadCreate, LeadUpdate, LeadResponse, LeadListResponse
from app.services.email_service import email_service

router = APIRouter()

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(lead_in: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Public lead capture with anti-spam honeypot and instant alert dispatch."""
    # 1. Anti-spam honeypot
    if lead_in.honeypot:
        # Return fake object for bots without storing or alerting
        return LeadResponse(
            id="bot-rejected",
            name=lead_in.name,
            email=lead_in.email,
            phone=lead_in.phone,
            service_interested=lead_in.service or "Consultation",
            source_page=lead_in.source_page or "index.html",
            status="closed",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

    # 2. Create lead in database
    lead = LeadInquiry(
        name=lead_in.name,
        email=lead_in.email.lower(),
        phone=lead_in.phone,
        service_interested=lead_in.service or "General Consultation",
        message=lead_in.message,
        source_page=lead_in.source_page or "index.html",
        status="new",
        utm_metadata=lead_in.utm_metadata or {}
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    # 3. Fire background transactional alert
    await email_service.send_lead_alert({
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "service": lead.service_interested,
        "message": lead.message,
        "source_page": lead.source_page
    })

    return lead

@router.get("", response_model=LeadListResponse)
async def list_leads(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only: query paginated leads with status filtering and search."""
    stmt = select(LeadInquiry)
    count_stmt = select(func.count(LeadInquiry.id))

    if status_filter and status_filter != "all":
        stmt = stmt.where(LeadInquiry.status == status_filter)
        count_stmt = count_stmt.where(LeadInquiry.status == status_filter)

    if search:
        search_fmt = f"%{search.lower()}%"
        condition = (
            func.lower(LeadInquiry.name).like(search_fmt)
            | func.lower(LeadInquiry.email).like(search_fmt)
            | LeadInquiry.phone.like(search_fmt)
        )
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(desc(LeadInquiry.created_at)).offset((page - 1) * size).limit(size)
    items = (await db.execute(stmt)).scalars().all()

    return LeadListResponse(total=total, page=page, size=size, items=items)

@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    update_data: LeadUpdate,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only: update lead status (e.g. new -> contacted -> converted)."""
    stmt = select(LeadInquiry).where(LeadInquiry.id == lead_id)
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    for field, val in update_data.model_dump(exclude_unset=True).items():
        setattr(lead, field, val)

    await db.commit()
    await db.refresh(lead)
    return lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only: delete inquiry."""
    stmt = select(LeadInquiry).where(LeadInquiry.id == lead_id)
    lead = (await db.execute(stmt)).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    await db.delete(lead)
    await db.commit()
    return None
