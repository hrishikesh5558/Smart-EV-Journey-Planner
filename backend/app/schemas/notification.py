from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class BatteryUpdateRequest(BaseModel):
    battery_percentage: float = Field(..., ge=0.0, le=100.0, description="Current battery percentage (0-100)")
    vehicle_id: Optional[str] = None
    notes: Optional[str] = None


class BatteryUpdateResponse(BaseModel):
    success: bool
    battery_percentage: float
    previous_battery_percentage: Optional[float] = None
    charge_reset_applied: bool = False
    safety_reserve: int
    active_thresholds: List[int]
    notification_triggered: bool
    notification_type: Optional[str] = None
    triggered_threshold: Optional[int] = None
    last_notified_threshold: Optional[int] = None
    whatsapp_configured: bool
    notification_result: Optional[dict] = None
    message: str


class BatteryStatusResponse(BaseModel):
    current_battery_percentage: Optional[float] = None
    last_threshold_notified: Optional[int] = None
    last_updated: Optional[datetime] = None
    safety_reserve: int
    active_thresholds: List[int]
    whatsapp_enabled: bool
    whatsapp_configured: bool
    phone_number: Optional[str] = None
    country_code: Optional[str] = "+91"
    notes: Optional[str] = None


class NotificationLogOut(BaseModel):
    id: str
    phone_number: Optional[str] = None
    battery_percentage: Optional[float] = None
    triggered_threshold: Optional[int] = None
    notification_type: str
    notification_status: str
    provider: str
    provider_message_id: Optional[str] = None
    message_body: str
    created_at: datetime


class ThresholdsResponse(BaseModel):
    safety_reserve: int
    thresholds: List[int]
    initial_warning: int
    critical_warning: int
    explanation: str


class TestNotificationResponse(BaseModel):
    success: bool
    status: str
    provider: str
    recipient: Optional[str] = None
    message: str
    error_detail: Optional[str] = None
