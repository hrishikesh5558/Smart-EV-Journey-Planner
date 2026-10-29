from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import datetime
import re


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    accept_terms: bool = True

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Full name too long")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "UserRegister":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        if not self.accept_terms:
            raise ValueError("You must accept the terms and conditions")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    default_safety_reserve: int = 10
    preferred_unit: str = "km"
    phone_number: Optional[str] = None
    country_code: Optional[str] = "+91"
    whatsapp_enabled: bool = False
    whatsapp_configured: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    default_safety_reserve: Optional[int] = None
    preferred_unit: Optional[str] = None
    phone_number: Optional[str] = None
    country_code: Optional[str] = None
    whatsapp_enabled: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Full name must be at least 2 characters")
        return v

    @field_validator("default_safety_reserve")
    @classmethod
    def valid_reserve(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (5 <= v <= 40):
            raise ValueError("Safety reserve must be between 5% and 40%")
        return v

    @field_validator("phone_number")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v == "":
                return None
            # Allow digits, spaces, hyphens, parentheses
            cleaned = re.sub(r"[\s\-\(\)]", "", v)
            if not re.match(r"^\+?\d{7,15}$", cleaned):
                raise ValueError("Invalid phone number format. Provide 7-15 digits.")
            return cleaned
        return v

    @field_validator("country_code")
    @classmethod
    def clean_country_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v.startswith("+"):
                v = "+" + v
            if not re.match(r"^\+\d{1,4}$", v):
                raise ValueError("Invalid country code format (e.g. +91, +1).")
        return v
