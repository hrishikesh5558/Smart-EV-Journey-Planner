"""
Range Analysis Engine for Smart EV.

Performs journey feasibility calculations based on current remaining range,
destination distance, and safety reserve.

Calculation specification:
Usable range = Estimated remaining range - Safety reserve distance
If reserve configured as percentage:
Safety reserve distance = Estimated remaining range * Reserve percentage / 100
Remaining margin after journey = Usable range - Journey distance

Decision logic:
If journey distance <= usable range:
    "Estimated range appears sufficient."
If journey distance > usable range:
    "Charging before departure or planning a charging stop is recommended."
"""

from dataclasses import dataclass
from typing import Optional

# If range margin is between 0 and this threshold (km), provide narrow reserve advisory
LOW_RESERVE_THRESHOLD_KM = 20.0

# Range disclaimer as specified
RANGE_DISCLAIMER = (
    "Actual driving range depends on traffic, road conditions, weather, speed, "
    "battery condition, and driving style."
)


@dataclass
class RangeAnalysisResult:
    destination_distance_km: float
    safety_reserve_percent: float
    required_range_km: float                    # distance * (1 + reserve/100)
    current_remaining_range_km: float
    range_margin_km: float                      # current - required (negative = shortage)

    # Specification fields
    usable_range_km: float                      # current - reserve_distance_km
    reserve_distance_km: float                  # current * reserve/100
    remaining_margin_after_journey_km: float    # usable_range - distance
    is_sufficient: bool

    # Status & presentation
    result_status: str                          # "feasible" | "low_reserve" | "charging_recommended"
    recommendation: str
    feasibility_label: str
    color_class: str                            # "green" | "amber" | "red"
    shortage_km: Optional[float]                # None if sufficient, positive value if deficit
    disclaimer: str = RANGE_DISCLAIMER

    # Aliases
    @property
    def estimated_remaining_range_km(self) -> float:
        return self.current_remaining_range_km

    @property
    def planned_journey_distance_km(self) -> float:
        return self.destination_distance_km

    @property
    def reserve_percentage(self) -> float:
        return self.safety_reserve_percent


def analyze_journey(
    current_remaining_range_km: float,
    destination_distance_km: float,
    safety_reserve_percent: float = 15.0,
    reserve_distance_km: Optional[float] = None,
    driving_conditions: Optional[str] = None,
) -> RangeAnalysisResult:
    """
    Core range feasibility calculation.

    Specification:
        Safety Reserve Distance = Estimated Remaining Range * Safety Reserve Percentage / 100
        Usable Range = Estimated Remaining Range - Safety Reserve Distance
        Remaining Journey Margin = Usable Range - Journey Distance
    """
    if destination_distance_km is None or destination_distance_km <= 0:
        raise ValueError("Journey distance must be positive and greater than 0.")
    if current_remaining_range_km is None or current_remaining_range_km < 0:
        raise ValueError("Remaining range cannot be negative.")

    # Calculate safety reserve distance
    if reserve_distance_km is not None and reserve_distance_km >= 0:
        actual_reserve_dist = float(reserve_distance_km)
        actual_reserve_pct = (
            (actual_reserve_dist / current_remaining_range_km * 100.0)
            if current_remaining_range_km > 0
            else 0.0
        )
    else:
        actual_reserve_pct = float(safety_reserve_percent if safety_reserve_percent is not None else 15.0)
        actual_reserve_dist = round(current_remaining_range_km * actual_reserve_pct / 100.0, 2)

    usable_range = round(current_remaining_range_km - actual_reserve_dist, 2)
    margin_after_journey = round(usable_range - destination_distance_km, 2)

    # Legacy formulas preserved for backward compatibility & test expectations
    required_range = round(destination_distance_km * (1 + actual_reserve_pct / 100.0), 2)
    range_margin = round(current_remaining_range_km - required_range, 2)

    is_sufficient = destination_distance_km <= usable_range

    if not is_sufficient:
        status = "charging_recommended"
        label = "Charging Recommended"
        color = "red"
        shortage = round(abs(margin_after_journey), 2)
        rec = "Charging before departure or planning a charging stop is recommended."
    else:
        status = "feasible"
        label = "Estimated range appears sufficient with the selected reserve."
        color = "green"
        shortage = None
        rec = "Your estimated driving range appears sufficient for this journey with the selected safety reserve."

    return RangeAnalysisResult(
        destination_distance_km=destination_distance_km,
        safety_reserve_percent=actual_reserve_pct,
        required_range_km=required_range,
        current_remaining_range_km=current_remaining_range_km,
        range_margin_km=range_margin,
        usable_range_km=usable_range,
        reserve_distance_km=actual_reserve_dist,
        remaining_margin_after_journey_km=margin_after_journey,
        is_sufficient=is_sufficient,
        result_status=status,
        recommendation=rec,
        feasibility_label=label,
        color_class=color,
        shortage_km=shortage,
        disclaimer=RANGE_DISCLAIMER,
    )
