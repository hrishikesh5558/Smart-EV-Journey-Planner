from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.database.mongodb import get_db, serialize_doc, serialize_docs, to_object_id
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleOut
from app.core.security import get_current_user

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])


def _user_id_filter(user_id: str):
    oid = to_object_id(user_id)
    if oid:
        return {"$in": [str(user_id), oid]}
    return str(user_id)


def _find_vehicle_or_404(vehicle_id: str, user_id: str, db) -> dict:
    oid = to_object_id(vehicle_id)
    if not oid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )
    vehicle = db.vehicles.find_one({"_id": oid, "user_id": _user_id_filter(user_id)})
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )
    return vehicle


@router.get("", response_model=List[VehicleOut])
def list_vehicles(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    docs = list(db.vehicles.find({"user_id": _user_id_filter(current_user.id)}).sort("created_at", -1))
    return serialize_docs(docs)


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    vehicle_doc = {
        "user_id": current_user.id,
        "nickname": payload.nickname.strip(),
        "manufacturer": payload.manufacturer.strip(),
        "model": payload.model.strip(),
        "model_year": payload.model_year,
        "battery_capacity_kwh": payload.battery_capacity_kwh,
        "full_charge_range_km": payload.full_charge_range_km or 400.0,
        "registration_identifier": payload.registration_identifier.strip() if payload.registration_identifier else None,
        "image_reference": None,
        "image_path": None,
        "notes": payload.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = db.vehicles.insert_one(vehicle_doc)
    vehicle_doc["_id"] = result.inserted_id
    return serialize_doc(vehicle_doc)


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    vehicle = _find_vehicle_or_404(vehicle_id, current_user.id, db)
    return serialize_doc(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    _find_vehicle_or_404(vehicle_id, current_user.id, db)
    update_data = payload.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow()

    oid = to_object_id(vehicle_id)
    db.vehicles.update_one({"_id": oid, "user_id": _user_id_filter(current_user.id)}, {"$set": update_data})
    updated = db.vehicles.find_one({"_id": oid, "user_id": _user_id_filter(current_user.id)})
    return serialize_doc(updated)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    _find_vehicle_or_404(vehicle_id, current_user.id, db)
    oid = to_object_id(vehicle_id)
    db.vehicles.delete_one({"_id": oid, "user_id": _user_id_filter(current_user.id)})



