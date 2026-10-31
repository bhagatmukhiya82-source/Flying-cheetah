import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env"
        ),
        extra="allow"
    )

    PROJECT_NAME: str = "Flying Cheetah Labs Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "https://flying-cheetah.vercel.app",
        "https://flyingcheetah.agency",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "*"
    ]
    
    # Security & JWT
    SECRET_KEY: str = "flying_cheetah_super_secure_jwt_secret_key_2026_mumbai_d2c_ai"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Admin Credentials
    OFFICIAL_ADMIN_EMAIL: str = "flyingcheetah.agency@gmail.com"
    ADMIN_EMAILS: List[str] = [
        "flyingcheetah.agency@gmail.com",
        "bhagatmukhiya@gmail.com",
        "yashgaikwad@gmail.com"
    ]
    
    # Database
    # Defaults to SQLite async for local development & automated test execution
    # Set to PostgreSQL asyncpg connection string in production (Supabase)
    DATABASE_URL: str = "sqlite+aiosqlite:///./flying_cheetah.db"
    
    # Supabase Credentials
    SUPABASE_URL: str = "https://txqtkpxdyoatzdgkcsry.supabase.co"
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # Redis & Task Queue
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Meta WhatsApp Cloud API v21.0
    META_GRAPH_VERSION: str = "v21.0"
    META_WA_TOKEN: str = "MOCK_META_WA_TOKEN"
    META_PHONE_NUMBER_ID: str = "MOCK_PHONE_ID_100234"
    META_WABA_ID: str = "MOCK_WABA_ID_98765"
    META_WEBHOOK_VERIFY_TOKEN: str = "flying_cheetah_verify_token_2026"
    META_APP_SECRET: str = "mock_meta_app_secret_abc123"
    
    # Instagram Graph API
    META_IG_ACCOUNT_ID: str = "MOCK_IG_ACCOUNT_998877"
    
    # Hyperlocal Courier APIs (Borzo & Porter)
    BORZO_AUTH_TOKEN: str = "MOCK_BORZO_AUTH_TOKEN"
    BORZO_API_URL: str = "https://robot-in.borzodelivery.com/api/business/1.8"
    PORTER_API_KEY: str = "MOCK_PORTER_API_KEY"
    
    # Voice AI Pipeline (Twilio / Exotel / Deepgram / ElevenLabs)
    TWILIO_ACCOUNT_SID: str = "MOCK_TWILIO_ACCOUNT_SID"
    TWILIO_AUTH_TOKEN: str = "MOCK_TWILIO_AUTH_TOKEN"
    TWILIO_CALLER_NUMBER: str = "+919876543210"
    OPENAI_API_KEY: str = "MOCK_OPENAI_API_KEY"
    ELEVENLABS_API_KEY: str = "MOCK_ELEVENLABS_API_KEY"
    
    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = "rzp_test_flying_cheetah_2026"
    RAZORPAY_KEY_SECRET: str = "mock_rzp_secret_key_8899"
    
    # n8n Automation Webhook
    N8N_WEBHOOK_URL: str = ""
    
    # Email SMTP / Resend
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "flyingcheetah.agency@gmail.com"
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Flying Cheetah Security"

settings = Settings()
