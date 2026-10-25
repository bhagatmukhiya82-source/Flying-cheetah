from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user_token
)
from app.core.config import settings
from app.models.user import Profile
from app.schemas.auth_schema import (
    TrialRegistrationRequest, 
    LoginRequest, 
    GoogleCallbackRequest, 
    TokenResponse, 
    UserProfileResponse
)

router = APIRouter()

@router.post("/register-trial", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_trial(req: TrialRegistrationRequest, db: AsyncSession = Depends(get_db)):
    # 1. Anti-spam honeypot check
    if req.honeypot:
        # Silent success for bots
        return TokenResponse(
            access_token="mock_token_bot",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user={"email": req.email, "full_name": req.name, "role": "client", "trial_active": True}
        )

    # 2. Check existing user
    stmt = select(Profile).where(Profile.email == req.email.lower())
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please Sign In."
        )

    # 3. Create profile
    is_admin = req.email.lower() == settings.OFFICIAL_ADMIN_EMAIL.lower() or req.email.lower() in [e.lower() for e in settings.ADMIN_EMAILS]
    role = "admin" if is_admin else "client"

    profile = Profile(
        email=req.email.lower(),
        full_name=req.name or req.full_name or "Founder",
        hashed_password=get_password_hash(req.password),
        phone=req.phone,
        store_url=req.store_url,
        role=role,
        trial_active=True,
        trial_started_at=datetime.now(timezone.utc),
        trial_days_left=14
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    # 4. Generate JWT
    token = create_access_token(
        subject=profile.id,
        extra_claims={"email": profile.email, "role": profile.role, "name": profile.full_name}
    )

    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user={
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "role": profile.role,
            "trial_active": profile.trial_active,
            "trial_days_left": profile.trial_days_left
        }
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Profile).where(Profile.email == req.email.lower())
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile or not verify_password(req.password, profile.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    token = create_access_token(
        subject=profile.id,
        extra_claims={"email": profile.email, "role": profile.role, "name": profile.full_name}
    )

    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user={
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "role": profile.role,
            "trial_active": profile.trial_active,
            "trial_days_left": profile.trial_days_left
        }
    )

@router.post("/google-callback", response_model=TokenResponse)
async def google_callback(req: GoogleCallbackRequest, db: AsyncSession = Depends(get_db)):
    """Handles Google OAuth token exchange. Auto-provisions profile if new."""
    stmt = select(Profile).where(Profile.email == req.email.lower())
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    is_admin = req.email.lower() == settings.OFFICIAL_ADMIN_EMAIL.lower() or req.email.lower() in [e.lower() for e in settings.ADMIN_EMAILS]

    if not profile:
        profile = Profile(
            email=req.email.lower(),
            full_name=req.name or req.email.split("@")[0],
            avatar_url=req.avatar_url,
            role="admin" if is_admin else "client",
            trial_active=True,
            trial_days_left=14
        )
        db.add(profile)
        await db.flush()

    token = create_access_token(
        subject=profile.id,
        extra_claims={"email": profile.email, "role": profile.role, "name": profile.full_name}
    )

    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user={
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "role": profile.role,
            "trial_active": profile.trial_active,
            "trial_days_left": profile.trial_days_left,
            "is_admin": is_admin
        }
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_token: dict = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Profile).where(Profile.id == current_token["sub"])
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile
