import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Flying Cheetah Labs Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://flyingcheetah.agency",
        "*"
    ]
    
    # Security & JWT
    SECRET_KEY: str = Field(
        default="flying_cheetah_super_secure_jwt_secret_key_2026_mumbai_d2c_ai",
        env="SECRET_KEY"
    )
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
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./flying_cheetah.db",
        env="DATABASE_URL"
    )
    
    # Supabase Credentials
    SUPABASE_URL: str = Field(
        default="https://txqtkpxdyoatzdgkcsry.supabase.co",
        env="SUPABASE_URL"
    )
    SUPABASE_ANON_KEY: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE",
        env="SUPABASE_ANON_KEY"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="",
        env="SUPABASE_SERVICE_ROLE_KEY"
    )
    
    # Redis & Task Queue
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    
    # Meta WhatsApp Cloud API v21.0
    META_GRAPH_VERSION: str = "v21.0"
    META_WA_TOKEN: str = Field(default="MOCK_META_WA_TOKEN", env="META_WA_TOKEN")
    META_PHONE_NUMBER_ID: str = Field(default="MOCK_PHONE_ID_100234", env="META_PHONE_NUMBER_ID")
    META_WABA_ID: str = Field(default="MOCK_WABA_ID_98765", env="META_WABA_ID")
    META_WEBHOOK_VERIFY_TOKEN: str = Field(default="flying_cheetah_verify_token_2026", env="META_WEBHOOK_VERIFY_TOKEN")
    META_APP_SECRET: str = Field(default="mock_meta_app_secret_abc123", env="META_APP_SECRET")
    
    # Instagram Graph API
    META_IG_ACCOUNT_ID: str = Field(default="MOCK_IG_ACCOUNT_998877", env="META_IG_ACCOUNT_ID")
    
    # Hyperlocal Courier APIs (Borzo & Porter)
    BORZO_AUTH_TOKEN: str = Field(default="MOCK_BORZO_AUTH_TOKEN", env="BORZO_AUTH_TOKEN")
    BORZO_API_URL: str = Field(default="https://robot-in.borzodelivery.com/api/business/1.8", env="BORZO_API_URL")
    PORTER_API_KEY: str = Field(default="MOCK_PORTER_API_KEY", env="PORTER_API_KEY")
    
    # Voice AI Pipeline (Twilio / Exotel / Deepgram / ElevenLabs)
    TWILIO_ACCOUNT_SID: str = Field(default="MOCK_TWILIO_ACCOUNT_SID", env="TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: str = Field(default="MOCK_TWILIO_AUTH_TOKEN", env="TWILIO_AUTH_TOKEN")
    TWILIO_CALLER_NUMBER: str = Field(default="+919876543210", env="TWILIO_CALLER_NUMBER")
    OPENAI_API_KEY: str = Field(default="MOCK_OPENAI_API_KEY", env="OPENAI_API_KEY")
    ELEVENLABS_API_KEY: str = Field(default="MOCK_ELEVENLABS_API_KEY", env="ELEVENLABS_API_KEY")
    
    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_flying_cheetah_2026", env="RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET: str = Field(default="mock_rzp_secret_key_8899", env="RAZORPAY_KEY_SECRET")
    
    # n8n Automation Webhook
    N8N_WEBHOOK_URL: str = Field(default="", env="N8N_WEBHOOK_URL")
    
    # Email SMTP / Resend
    SMTP_HOST: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USER: str = Field(default="flyingcheetah.agency@gmail.com", env="SMTP_USER")
    SMTP_PASSWORD: str = Field(default="", env="SMTP_PASSWORD")
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
