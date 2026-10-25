from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.leads import router as leads_router
from app.api.v1.endpoints.demos import router as demos_router
from app.api.v1.endpoints.webhooks import router as webhooks_router
from app.api.v1.endpoints.voice import router as voice_router
from app.api.v1.endpoints.fleet import router as fleet_router
from app.api.v1.endpoints.telemetry import router as telemetry_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(leads_router, prefix="/leads", tags=["Leads & Inquiries"])
api_v1_router.include_router(demos_router, prefix="/demos", tags=["Demo Bookings"])
api_v1_router.include_router(webhooks_router, prefix="/webhooks", tags=["Webhooks"])
api_v1_router.include_router(voice_router, prefix="/voice", tags=["AI Voice Agent"])
api_v1_router.include_router(fleet_router, prefix="/fleet", tags=["Fleet & Hyperlocal Logistics"])
api_v1_router.include_router(telemetry_router, prefix="/telemetry", tags=["Platform Telemetry"])
