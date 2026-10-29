"""
Journey API endpoints for Smart EV – Manual Input Range Planner.

POST   /api/journeys/calculate   – stateless calculation (no DB write)
POST   /api/journeys/save        – calculate + persist to MongoDB
GET    /api/journeys/history     – authenticated user's history
GET    /api/journeys/{id}        – single record
DELETE /api/journeys/{id}        – delete own record
GET    /api/journeys/stats/summary – dashboard stats
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from app.database.mongodb import get_db, serialize_doc, serialize_docs, to_object_id
from app.models.user import User
from app.schemas.journey import (
    JourneySaveRequest,
    JourneyOut,
    JourneyAnalysisResult,
    JourneyCalculateRequest,
    JourneyCalculateResponse,
)
from app.core.security import get_current_user
from app.services.range_service import analyze_journey

router = APIRouter(prefix="/api/journeys", tags=["Journeys"])


def _user_id_filter(user_id: str):
    oid = to_object_id(user_id)
    if oid:
        return {"$in": [str(user_id), oid]}
    return str(user_id)


# ─────────────────────────────────────────────
# 1. Stateless Calculate: POST /api/journeys/calculate
# ─────────────────────────────────────────────
@router.post("/calculate", response_model=JourneyCalculateResponse)
def calculate_journey_range(
    payload: JourneyCalculateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Calculate range sufficiency from manual inputs without saving.
    Formula:
        Safety Reserve Distance = Estimated Remaining Range * Reserve Percentage / 100
        Usable Range = Estimated Remaining Range - Safety Reserve Distance
        Remaining Journey Margin = Usable Range - Journey Distance
    """
    try:
        result = analyze_journey(
            current_remaining_range_km=payload.estimated_remaining_range_km,
            destination_distance_km=payload.planned_journey_distance_km,
            safety_reserve_percent=payload.reserve_percentage if payload.reserve_percentage is not None else 15.0,
            driving_conditions=payload.driving_conditions,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return JourneyCalculateResponse(
        current_battery_percentage=payload.current_battery_percentage,
        estimated_remaining_range_km=result.current_remaining_range_km,
        planned_journey_distance_km=result.destination_distance_km,
        reserve_percentage=result.safety_reserve_percent,
        reserve_distance_km=result.reserve_distance_km,
        usable_range_km=result.usable_range_km,
        remaining_margin_km=result.remaining_margin_after_journey_km,
        is_sufficient=result.is_sufficient,
        result_status=result.result_status,
        recommendation=result.recommendation,
        feasibility_label=result.feasibility_label,
        color_class=result.color_class,
        shortage_km=result.shortage_km,
        disclaimer=result.disclaimer,
    )


# ─────────────────────────────────────────────
# 2. Save Journey: POST /api/journeys/save
# ─────────────────────────────────────────────
@router.post("/save", response_model=JourneyAnalysisResult, status_code=status.HTTP_201_CREATED)
def save_journey(
    payload: JourneySaveRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Calculate range sufficiency from manual inputs and persist to MongoDB.
    """
    # Verify vehicle ownership if provided
    clean_vehicle_id = payload.vehicle_id.strip() if payload.vehicle_id and payload.vehicle_id.strip() else None
    if clean_vehicle_id:
        v_oid = to_object_id(clean_vehicle_id)
        if not v_oid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid vehicle ID format.")
        user_oid = to_object_id(current_user.id)
        user_filter = {"$in": [str(current_user.id), user_oid]} if user_oid else str(current_user.id)
        vehicle = db.vehicles.find_one({"_id": v_oid, "user_id": user_filter})
        if not vehicle:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in your garage.")

        # Pull manufacturer/model from vehicle record if not supplied
        if not payload.manufacturer and vehicle.get("manufacturer"):
            payload.manufacturer = vehicle["manufacturer"]
        if not payload.model and vehicle.get("model"):
            payload.model = vehicle["model"]
        if not payload.battery_capacity_kwh and vehicle.get("battery_capacity_kwh"):
            payload.battery_capacity_kwh = vehicle["battery_capacity_kwh"]

    # Run calculation
    try:
        result = analyze_journey(
            current_remaining_range_km=payload.estimated_remaining_range_km,
            destination_distance_km=payload.journey_distance_km,
            safety_reserve_percent=payload.reserve_percentage,
            driving_conditions=payload.driving_conditions,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    destination_label = (payload.destination or "Planned Destination").strip()
    now = datetime.utcnow()

    journey_doc = {
        "user_id": str(current_user.id),
        # Vehicle
        "vehicle_id": clean_vehicle_id,
        "manufacturer": payload.manufacturer,
        "model": payload.model,
        "battery_capacity_kwh": payload.battery_capacity_kwh,
        # Readings
        "current_battery_percentage": payload.current_battery_percentage,
        "battery_percentage_used": payload.current_battery_percentage,   # legacy alias
        "estimated_remaining_range_km": result.current_remaining_range_km,
        "current_remaining_range_km": result.current_remaining_range_km, # legacy alias
        # Journey
        "starting_location": payload.starting_location,
        "destination": destination_label,
        "destination_name": destination_label,              # legacy alias
        "journey_distance_km": result.destination_distance_km,
        "destination_distance_km": result.destination_distance_km,       # legacy alias
        "reserve_percentage": result.safety_reserve_percent,
        "safety_reserve_percent": result.safety_reserve_percent,         # legacy alias
        "reserve_distance_km": result.reserve_distance_km,
        "usable_range_km": result.usable_range_km,
        "remaining_margin_km": result.remaining_margin_after_journey_km,
        "notes": payload.notes,
        "driving_conditions": payload.driving_conditions,
        # Results
        "result_status": result.result_status,
        "recommendation": result.recommendation,
        "is_sufficient": result.is_sufficient,
        # Legacy
        "required_range_km": result.required_range_km,
        "range_margin_km": result.range_margin_km,
        "is_sample_mode": False,
        "range_provenance": "manual_input",
        "created_at": now,
    }

    insert_res = db.journeys.insert_one(journey_doc)
    journey_doc["_id"] = insert_res.inserted_id

    serialized = serialize_doc(journey_doc)

    return JourneyAnalysisResult(
        journey=JourneyOut.model_validate(serialized),
        surplus_km=max(0.0, result.remaining_margin_after_journey_km),
        shortage_km=result.shortage_km,
        feasibility_label=result.feasibility_label,
        color_class=result.color_class,
    )


# ─────────────────────────────────────────────
# 3. History: GET /api/journeys/history & GET /api/journeys
# ─────────────────────────────────────────────
@router.get("/history", response_model=List[JourneyOut])
@router.get("", response_model=List[JourneyOut])
def list_journeys(
    vehicle_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    query = {"user_id": _user_id_filter(current_user.id)}
    if vehicle_id:
        query["vehicle_id"] = str(vehicle_id)
    docs = list(db.journeys.find(query).sort("created_at", -1).limit(200))
    return serialize_docs(docs)


# ─────────────────────────────────────────────
# 4. Stats Summary: GET /api/journeys/stats/summary
# ─────────────────────────────────────────────
@router.get("/stats/summary")
def get_journey_stats(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    user_filter = _user_id_filter(current_user.id)
    total_vehicles = db.vehicles.count_documents({"user_id": user_filter})
    total_journeys = db.journeys.count_documents({"user_id": user_filter})
    feasible = db.journeys.count_documents({"user_id": user_filter, "result_status": "feasible"})
    charging_recommended = db.journeys.count_documents(
        {"user_id": user_filter, "result_status": "charging_recommended"}
    )
    recent_journeys = list(
        db.journeys.find({"user_id": user_filter}).sort("created_at", -1).limit(5)
    )
    return {
        "total_vehicles": total_vehicles,
        "total_journeys": total_journeys,
        "feasible_journeys": feasible,
        "charging_recommended_journeys": charging_recommended,
        "total_analyses": 0,
        "recent_journeys": serialize_docs(recent_journeys),
    }


# ─────────────────────────────────────────────
# 5. Get Single Journey: GET /api/journeys/{journey_id}
# ─────────────────────────────────────────────
@router.get("/{journey_id}", response_model=JourneyOut)
def get_journey(
    journey_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    oid = to_object_id(journey_id)
    if not oid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")
    journey = db.journeys.find_one({"_id": oid, "user_id": _user_id_filter(current_user.id)})
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")
    return serialize_doc(journey)


# ─────────────────────────────────────────────
# 6. Delete Journey: DELETE /api/journeys/{journey_id}
# ─────────────────────────────────────────────
@router.delete("/{journey_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journey(
    journey_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    oid = to_object_id(journey_id)
    if not oid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")
    journey = db.journeys.find_one({"_id": oid, "user_id": _user_id_filter(current_user.id)})
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")
    db.journeys.delete_one({"_id": oid, "user_id": _user_id_filter(current_user.id)})
