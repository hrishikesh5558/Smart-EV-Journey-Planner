"""
Journey Schemas for Smart EV – Manual Input Range Planner.
No image analysis or OCR. All values entered by the user.
"""

from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class JourneyCalculateRequest(BaseModel):
    """Request payload for the stateless calculate endpoint."""
    estimated_remaining_range_km: float
    planned_journey_distance_km: float
    current_battery_percentage: Optional[float] = None
    reserve_percentage: Optional[float] = 15.0
    driving_conditions: Optional[str] = None

    @field_validator("current_battery_percentage")
    @classmethod
    def validate_battery(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Battery percentage must be between 0 and 100.")
        return round(v, 1) if v is not None else None

    @field_validator("estimated_remaining_range_km")
    @classmethod
    def validate_range(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Estimated remaining range cannot be negative.")
        return round(v, 2)

    @field_validator("planned_journey_distance_km")
    @classmethod
    def validate_distance(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Journey distance must be greater than 0.")
        return round(v, 2)

    @field_validator("reserve_percentage")
    @classmethod
    def validate_reserve(cls, v: Optional[float]) -> float:
        if v is None:
            return 15.0
        if not (0 <= v <= 100):
            raise ValueError("Safety reserve percentage must be between 0 and 100.")
        return round(v, 2)


class JourneyCalculateResponse(BaseModel):
    current_battery_percentage: Optional[float] = None
    estimated_remaining_range_km: float
    planned_journey_distance_km: float
    reserve_percentage: float
    reserve_distance_km: float
    usable_range_km: float
    remaining_margin_km: float
    is_sufficient: bool
    result_status: str
    recommendation: str
    feasibility_label: str
    color_class: str
    shortage_km: Optional[float] = None
    disclaimer: str


class JourneySaveRequest(BaseModel):
    """Full request to save a calculated journey to MongoDB."""
    # Vehicle info
    vehicle_id: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    battery_capacity_kwh: Optional[float] = None

    # Battery & range readings (manual input)
    current_battery_percentage: float
    estimated_remaining_range_km: float

    # Journey details
    starting_location: Optional[str] = None
    destination: Optional[str] = None
    journey_distance_km: float
    reserve_percentage: float = 15.0
    notes: Optional[str] = None
    driving_conditions: Optional[str] = None

    # Calculation results (computed client-side mirror, authoritative on backend)
    reserve_distance_km: Optional[float] = None
    usable_range_km: Optional[float] = None
    remaining_margin_km: Optional[float] = None
    recommendation: Optional[str] = None
    result_status: Optional[str] = None
    is_sufficient: Optional[bool] = None

    @field_validator("current_battery_percentage")
    @classmethod
    def validate_battery(cls, v: float) -> float:
        if not (0 <= v <= 100):
            raise ValueError("Battery percentage must be between 0 and 100.")
        return round(v, 1)

    @field_validator("estimated_remaining_range_km")
    @classmethod
    def validate_range(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Estimated remaining range cannot be negative.")
        return round(v, 2)

    @field_validator("journey_distance_km")
    @classmethod
    def validate_distance(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Journey distance must be greater than 0.")
        return round(v, 2)

    @field_validator("reserve_percentage")
    @classmethod
    def validate_reserve(cls, v: float) -> float:
        if not (0 <= v <= 100):
            raise ValueError("Safety reserve percentage must be between 0 and 100.")
        return round(v, 2)


class JourneyOut(BaseModel):
    id: str
    user_id: str

    # Vehicle
    vehicle_id: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    battery_capacity_kwh: Optional[float] = None

    # Readings
    current_battery_percentage: Optional[float] = None
    battery_percentage_used: Optional[float] = None     # legacy alias
    estimated_remaining_range_km: Optional[float] = None
    current_remaining_range_km: Optional[float] = None  # legacy alias

    # Journey
    starting_location: Optional[str] = None
    destination: Optional[str] = None
    destination_name: Optional[str] = None              # legacy alias
    journey_distance_km: Optional[float] = None
    destination_distance_km: Optional[float] = None     # legacy alias
    reserve_percentage: Optional[float] = None
    safety_reserve_percent: Optional[float] = None      # legacy alias
    reserve_distance_km: Optional[float] = None
    usable_range_km: Optional[float] = None
    remaining_margin_km: Optional[float] = None
    notes: Optional[str] = None
    driving_conditions: Optional[str] = None

    # Results
    result_status: Optional[str] = None
    recommendation: Optional[str] = None
    is_sufficient: Optional[bool] = None

    # Legacy fields kept for backward compatibility with existing history records
    required_range_km: Optional[float] = None
    range_margin_km: Optional[float] = None
    is_sample_mode: bool = False
    range_provenance: str = "manual_input"

    created_at: datetime

    class Config:
        from_attributes = True


class JourneyAnalysisResult(BaseModel):
    """Wraps JourneyOut with surplus/shortage for frontend compatibility."""
    journey: JourneyOut
    surplus_km: float = 0.0
    shortage_km: Optional[float] = None
    feasibility_label: str
    color_class: str
