"""
Journey model for Smart EV – Manual Input Range Planner.
No image analysis, OCR, or Tesseract dependencies.
"""

from datetime import datetime
from typing import Optional, Any


class Journey:
    """MongoDB Journey entity representation (manual input only)."""

    def __init__(
        self,
        id: str = "",
        user_id: str = "",
        vehicle_id: Optional[str] = None,
        # Vehicle details
        manufacturer: Optional[str] = None,
        model: Optional[str] = None,
        battery_capacity_kwh: Optional[float] = None,
        # Readings
        current_battery_percentage: Optional[float] = None,
        battery_percentage_used: Optional[float] = None,   # legacy alias
        estimated_remaining_range_km: float = 0.0,
        current_remaining_range_km: float = 0.0,           # legacy alias
        # Journey details
        starting_location: Optional[str] = None,
        destination: Optional[str] = None,
        destination_name: str = "",                        # legacy alias
        journey_distance_km: float = 0.0,
        destination_distance_km: float = 0.0,             # legacy alias
        reserve_percentage: float = 15.0,
        safety_reserve_percent: float = 15.0,             # legacy alias
        reserve_distance_km: float = 0.0,
        usable_range_km: float = 0.0,
        remaining_margin_km: float = 0.0,
        notes: Optional[str] = None,
        driving_conditions: Optional[str] = None,
        # Results
        result_status: str = "feasible",
        recommendation: str = "",
        is_sufficient: bool = True,
        # Legacy fields preserved for backward compatibility
        required_range_km: float = 0.0,
        range_margin_km: float = 0.0,
        is_sample_mode: bool = False,
        range_provenance: str = "manual_input",
        created_at: Optional[datetime] = None,
        **kwargs: Any,
    ):
        self.id = str(id or kwargs.get("_id") or "")
        self.user_id = str(user_id)
        self.vehicle_id = str(vehicle_id) if vehicle_id else None
        # Vehicle
        self.manufacturer = manufacturer
        self.model = model
        self.battery_capacity_kwh = battery_capacity_kwh
        # Readings
        self.current_battery_percentage = current_battery_percentage or battery_percentage_used
        self.battery_percentage_used = self.current_battery_percentage
        self.estimated_remaining_range_km = estimated_remaining_range_km or current_remaining_range_km
        self.current_remaining_range_km = self.estimated_remaining_range_km
        # Journey
        self.starting_location = starting_location
        self.destination = destination or destination_name
        self.destination_name = self.destination
        self.journey_distance_km = journey_distance_km or destination_distance_km
        self.destination_distance_km = self.journey_distance_km
        self.reserve_percentage = reserve_percentage or safety_reserve_percent
        self.safety_reserve_percent = self.reserve_percentage
        self.reserve_distance_km = reserve_distance_km
        self.usable_range_km = usable_range_km
        self.remaining_margin_km = remaining_margin_km
        self.notes = notes
        self.driving_conditions = driving_conditions
        # Results
        self.result_status = result_status
        self.recommendation = recommendation
        self.is_sufficient = is_sufficient
        # Legacy
        self.required_range_km = required_range_km
        self.range_margin_km = range_margin_km
        self.is_sample_mode = is_sample_mode
        self.range_provenance = range_provenance
        self.created_at = created_at or datetime.utcnow()

    @classmethod
    def from_doc(cls, doc: dict) -> "Journey":
        return cls(
            id=str(doc.get("_id") or doc.get("id") or ""),
            user_id=str(doc.get("user_id", "")),
            vehicle_id=str(doc["vehicle_id"]) if doc.get("vehicle_id") else None,
            manufacturer=doc.get("manufacturer"),
            model=doc.get("model"),
            battery_capacity_kwh=doc.get("battery_capacity_kwh"),
            current_battery_percentage=doc.get("current_battery_percentage", doc.get("battery_percentage_used")),
            estimated_remaining_range_km=doc.get("estimated_remaining_range_km", doc.get("current_remaining_range_km", 0.0)),
            starting_location=doc.get("starting_location"),
            destination=doc.get("destination", doc.get("destination_name", "")),
            journey_distance_km=doc.get("journey_distance_km", doc.get("destination_distance_km", 0.0)),
            reserve_percentage=doc.get("reserve_percentage", doc.get("safety_reserve_percent", 15.0)),
            reserve_distance_km=doc.get("reserve_distance_km", 0.0),
            usable_range_km=doc.get("usable_range_km", 0.0),
            remaining_margin_km=doc.get("remaining_margin_km", 0.0),
            notes=doc.get("notes"),
            driving_conditions=doc.get("driving_conditions"),
            result_status=doc.get("result_status", "feasible"),
            recommendation=doc.get("recommendation", ""),
            is_sufficient=doc.get("is_sufficient", True),
            required_range_km=doc.get("required_range_km", 0.0),
            range_margin_km=doc.get("range_margin_km", 0.0),
            is_sample_mode=doc.get("is_sample_mode", doc.get("sample_mode", False)),
            range_provenance=doc.get("range_provenance", "manual_input"),
            created_at=doc.get("created_at"),
        )
