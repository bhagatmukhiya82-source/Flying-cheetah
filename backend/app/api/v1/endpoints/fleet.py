import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import require_admin
from app.models.user import Profile
from app.models.fleet import FleetOrder
from app.schemas.fleet_schema import FleetDispatchCreate, FleetTrackingResponse
from app.services.courier_borzo import borzo_service
from app.services.courier_porter import porter_service
from app.api.websockets.manager import ws_manager

logger = logging.getLogger("flyingcheetah.fleet_api")
router = APIRouter()

@router.post("/dispatch", response_model=FleetTrackingResponse, status_code=status.HTTP_201_CREATED)
async def dispatch_fleet_courier(
    payload: FleetDispatchCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Hyperlocal Courier Dispatch API (Mumbai & Pan-India).
    Selects Borzo (18-min hyperlocal bike delivery) or Porter (2-wheeler/mini-truck),
    creates tracking record, and streams live GPS coordinates via WebSockets.
    """
    courier = (payload.courier or "borzo").lower()
    
    if courier == "porter":
        dispatch_res = await porter_service.create_delivery(
            order_ref=payload.order_ref,
            pickup=payload.pickup_address,
            dropoff=payload.delivery_address
        )
        rider_info = dispatch_res.get("driver", {})
    else:
        # Default: Borzo 18-min delivery
        courier = "borzo"
        dispatch_res = await borzo_service.create_delivery(
            order_ref=payload.order_ref,
            pickup=payload.pickup_address,
            dropoff=payload.delivery_address,
            package_description=payload.package_description or "Ecommerce Goods",
            package_weight_kg=payload.package_weight_kg or 1.0
        )
        rider_info = dispatch_res.get("rider", {})

    fleet_order = FleetOrder(
        order_ref=payload.order_ref,
        courier=courier,
        courier_order_id=dispatch_res.get("order_id"),
        tracking_number=dispatch_res.get("tracking_number"),
        tracking_url=dispatch_res.get("tracking_url"),
        pickup_address=payload.pickup_address,
        delivery_address=payload.delivery_address,
        rider_name=rider_info.get("name"),
        rider_phone=rider_info.get("phone"),
        rider_lat=rider_info.get("lat"),
        rider_lng=rider_info.get("lng"),
        eta_minutes=dispatch_res.get("eta_minutes", 18),
        status=dispatch_res.get("status", "assigning"),
        delivery_fee_inr=dispatch_res.get("delivery_fee_inr", 85.0)
    )

    db.add(fleet_order)
    await db.commit()
    await db.refresh(fleet_order)

    # Broadcast initial courier assignment to telemetry WS
    background_tasks.add_task(
        ws_manager.broadcast_telemetry,
        {
            "type": "new_dispatch",
            "order_ref": fleet_order.order_ref,
            "courier": fleet_order.courier,
            "tracking_number": fleet_order.tracking_number,
            "eta_minutes": fleet_order.eta_minutes,
            "rider_name": fleet_order.rider_name,
            "rider_lat": fleet_order.rider_lat,
            "rider_lng": fleet_order.rider_lng
        }
    )

    return fleet_order

@router.get("/track/{order_ref}", response_model=FleetTrackingResponse)
async def track_fleet_order(
    order_ref: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Live tracking status and GPS coordinates for an active order.
    """
    query = select(FleetOrder).where(FleetOrder.order_ref == order_ref)
    result = await db.execute(query)
    fleet_order = result.scalar_one_or_none()

    if not fleet_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_ref}' not found in active fleet registry"
        )

    return fleet_order

@router.get("/orders", response_model=List[FleetTrackingResponse])
async def list_fleet_orders(
    courier: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: Profile = Depends(require_admin)
):
    """
    [Admin Guarded] List all active, dispatched, and historical courier orders.
    """
    query = select(FleetOrder).order_by(desc(FleetOrder.created_at)).offset(offset).limit(limit)
    if courier:
        query = query.where(FleetOrder.courier == courier)
    if status_filter:
        query = query.where(FleetOrder.status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()
