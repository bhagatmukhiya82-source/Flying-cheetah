import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_v1_router
from app.api.websockets.inbox_ws import router as inbox_ws_router
from app.api.websockets.telemetry_ws import router as telemetry_ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("flyingcheetah.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is initialized
    logger.info("⚡ Flying Cheetah Labs Backend Booting...")
    await init_db()
    logger.info("✅ Database tables initialized and ready.")
    yield
    # Shutdown
    logger.info("🛑 Flying Cheetah Labs Backend Shutting Down.")

app = FastAPI(
    title="Flying Cheetah Labs API",
    description="Autonomous AI Commerce & Omnichannel Marketing Backend Engine with 18-minute Mumbai Logistics, Voice AI & WhatsApp Workflows.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Cross-Origin Resource Sharing (CORS) Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(inbox_ws_router)
app.include_router(telemetry_ws_router)

@app.get("/health", tags=["System"])
async def health_check():
    """System health check and uptime probe."""
    return {
        "status": "healthy",
        "service": "flying-cheetah-backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "cluster": "mumbai-central-1"
    }

@app.get("/", tags=["System"])
async def root():
    """Root redirect / information endpoint."""
    return {
        "brand": "Flying Cheetah Labs",
        "tagline": "Autonomous AI Commerce Architecture",
        "docs": "/docs",
        "health": "/health",
        "api_v1": "/api/v1"
    }
