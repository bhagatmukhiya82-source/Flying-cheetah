from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

class TrialRegistrationRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr = Field(..., examples=["founder@mumbaibrand.in"])
    phone: str = Field(..., min_length=7, max_length=30, examples=["+91 98200 12345"])
    store_url: Optional[str] = Field(None, examples=["mumbaibrand.myshopify.com"])
    password: str = Field(..., min_length=6, examples=["SecurePass123!"])
    honeypot: Optional[str] = Field(None, alias="_hp_security_code")

    @model_validator(mode="before")
    @classmethod
    def resolve_name(cls, data: Any):
        if isinstance(data, dict):
            if "name" not in data and "full_name" in data:
                data["name"] = data["full_name"]
            elif "full_name" not in data and "name" in data:
                data["full_name"] = data["name"]
        return data

class LoginRequest(BaseModel):
    email: str = Field(..., examples=["founder@mumbaibrand.in"])
    password: str = Field(..., examples=["SecurePass123!"])

class GoogleCallbackRequest(BaseModel):
    email: EmailStr = Field(..., examples=["flyingcheetah.agency@gmail.com"])
    name: Optional[str] = Field(None, examples=["Bhagat Mukhiya"])
    avatar_url: Optional[str] = None
    access_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: dict

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    store_url: Optional[str] = None
    business_name: Optional[str] = None
    category_niche: Optional[str] = None
    gstin_udyam: Optional[str] = None
    whatsapp_support: Optional[str] = None
    pickup_address: Optional[str] = None
    merchant_upi_id: Optional[str] = None
    delivery_radius_km: Optional[int] = 15
    trial_active: bool
    trial_days_left: int
    avatar_url: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., examples=["founder@mumbaibrand.in"])
    phone: Optional[str] = Field(None, examples=["+91 98200 12345"])

class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str
    email: str
    otp: str
    expires_in_minutes: int = 10

class VerifyOtpRequest(BaseModel):
    email: EmailStr = Field(..., examples=["founder@mumbaibrand.in"])
    otp: str = Field(..., min_length=4, max_length=10, examples=["849201"])

class VerifyOtpResponse(BaseModel):
    success: bool
    valid: bool
    message: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., examples=["founder@mumbaibrand.in"])
    otp: str = Field(..., examples=["849201"])
    new_password: str = Field(..., min_length=6, examples=["SecureNewPass123!"])

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    store_url: Optional[str] = None
    business_name: Optional[str] = None
    category_niche: Optional[str] = None
    gstin_udyam: Optional[str] = None
    whatsapp_support: Optional[str] = None
    pickup_address: Optional[str] = None
    merchant_upi_id: Optional[str] = None
    delivery_radius_km: Optional[int] = None
    avatar_url: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = Field(None, examples=["SecureCurrentPass123!"])
    new_password: str = Field(..., min_length=6, examples=["NewSecurePass456!"])
    otp: Optional[str] = Field(None, examples=["482910"])


