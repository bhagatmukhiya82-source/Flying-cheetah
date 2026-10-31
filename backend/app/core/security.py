import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None, extra_claims: Optional[dict] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    if extra_claims:
        to_encode.update(extra_claims)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def verify_meta_signature(payload_bytes: bytes, hub_signature_header: str) -> bool:
    """Verifies X-Hub-Signature-256 for Meta WhatsApp and Instagram webhooks."""
    if not hub_signature_header or not hub_signature_header.startswith("sha256="):
        # In mock / test mode allow bypass if using mock secret
        if settings.META_APP_SECRET == "mock_meta_app_secret_abc123":
            return True
        return False
    
    expected_sig = hub_signature_header.split("sha256=")[1]
    calculated_sig = hmac.new(
        settings.META_APP_SECRET.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_sig, expected_sig)

def verify_razorpay_signature(payload_bytes: bytes, signature_header: Optional[str], secret: Optional[str] = None) -> bool:
    """Verifies X-Razorpay-Signature for incoming Razorpay payment webhooks."""
    webhook_secret = secret or getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if webhook_secret.startswith("mock_"):
        return True
    if not signature_header:
        return False
    calculated_sig = hmac.new(
        webhook_secret.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(calculated_sig, signature_header)

async def get_current_user_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or malformed authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

get_current_user = get_current_user_token

async def require_admin(payload: dict = Depends(get_current_user_token)) -> dict:
    email = (payload.get("email") or payload.get("sub") or "").lower()
    role = payload.get("role", "")
    
    is_admin = (
        email == settings.OFFICIAL_ADMIN_EMAIL.lower() 
        or email in [e.lower() for e in settings.ADMIN_EMAILS]
        or role == "admin"
    )
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Private Executive Portal strictly restricted to authorized agency administrators."
        )
    return payload
