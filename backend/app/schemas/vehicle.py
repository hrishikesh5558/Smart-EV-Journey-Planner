from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class VehicleCreate(BaseModel):
    model_config = {"protected_namespaces": ()}

    nickname: str
    manufacturer: str
    model: str
    model_year: Optional[int] = None
    battery_capacity_kwh: Optional[float] = None
    full_charge_range_km: Optional[float] = 400.0
    registration_identifier: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("nickname", "manufacturer", "model")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field cannot be empty")
        if len(v) > 100:
            raise ValueError("Value too long (max 100 characters)")
        return v

    @field_validator("full_charge_range_km")
    @classmethod
    def valid_range(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v <= 0:
                raise ValueError("Full charge range must be positive")
            if v > 2000:
                raise ValueError("Range seems unrealistically large (max 2000 km)")
        return v

    @field_validator("battery_capacity_kwh")
    @classmethod
    def valid_battery(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v <= 0:
                raise ValueError("Battery capacity must be positive")
            if v > 500:
                raise ValueError("Battery capacity seems unrealistically large")
        return v

    @field_validator("model_year")
    @classmethod
    def valid_year(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            if v < 2000 or v > 2030:
                raise ValueError("Model year must be between 2000 and 2030")
        return v


class VehicleUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}

    nickname: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    model_year: Optional[int] = None
    battery_capacity_kwh: Optional[float] = None
    full_charge_range_km: Optional[float] = None
    registration_identifier: Optional[str] = None
    notes: Optional[str] = None


class VehicleOut(BaseModel):
    id: str
    user_id: str
    nickname: str
    manufacturer: str
    model: str
    model_year: Optional[int] = None
    battery_capacity_kwh: Optional[float] = None
    full_charge_range_km: Optional[float] = 400.0
    registration_identifier: Optional[str] = None
    image_reference: Optional[str] = None
    image_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()
