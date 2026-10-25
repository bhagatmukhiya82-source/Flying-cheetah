from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, model_validator

class TrialRegistrationRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr = Field(..., example="founder@mumbaibrand.in")
    phone: str = Field(..., min_length=7, max_length=30, example="+91 98200 12345")
    store_url: Optional[str] = Field(None, example="mumbaibrand.myshopify.com")
    password: str = Field(..., min_length=6, example="SecurePass123!")
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
    email: EmailStr = Field(..., example="founder@mumbaibrand.in")
    password: str = Field(..., example="SecurePass123!")

class GoogleCallbackRequest(BaseModel):
    email: EmailStr = Field(..., example="flyingcheetah.agency@gmail.com")
    name: Optional[str] = Field(None, example="Bhagat Mukhiya")
    avatar_url: Optional[str] = None
    access_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: dict

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    store_url: Optional[str] = None
    trial_active: bool
    trial_days_left: int
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
