from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database.mongodb import get_db, serialize_doc, serialize_docs, to_object_id
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.notification import (
    BatteryUpdateRequest,
    BatteryUpdateResponse,
    BatteryStatusResponse,
    NotificationLogOut,
    ThresholdsResponse,
    TestNotificationResponse,
)
from app.services.whatsapp_service import (
    get_notification_thresholds,
    evaluate_and_notify_battery,
    send_test_notification,
)

router = APIRouter(tags=["Battery & Notifications"])


@router.post("/api/battery/update", response_model=BatteryUpdateResponse)
def update_battery_reading(
    payload: BatteryUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update vehicle battery reading, evaluate against dynamic safety reserve thresholds,
    and dispatch WhatsApp notifications if thresholds are crossed.
    """
    result = evaluate_and_notify_battery(
        user_id=current_user.id,
        current_battery=payload.battery_percentage,
        vehicle_id=payload.vehicle_id,
        notes=payload.notes,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("detail", "Failed to update battery reading."),
        )
    return BatteryUpdateResponse(**result)


@router.get("/api/battery/status", response_model=BatteryStatusResponse)
def get_battery_status(
    vehicle_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Get latest battery status, active thresholds, and WhatsApp alert readiness for current user.
    """
    state_filter = {"user_id": str(current_user.id)}
    if vehicle_id:
        state_filter["vehicle_id"] = str(vehicle_id)

    battery_state = db.battery_states.find_one(state_filter)
    reserve = current_user.default_safety_reserve or 10
    thresholds = get_notification_thresholds(reserve)

    phone = current_user.phone_number
    cc = current_user.country_code or "+91"
    whatsapp_enabled = bool(current_user.whatsapp_enabled)
    whatsapp_configured = bool(phone and len(phone) >= 7 and whatsapp_enabled)

    return BatteryStatusResponse(
        current_battery_percentage=battery_state.get("battery_percentage") if battery_state else None,
        last_threshold_notified=battery_state.get("last_threshold_notified") if battery_state else None,
        last_updated=battery_state.get("last_updated") if battery_state else None,
        safety_reserve=reserve,
        active_thresholds=thresholds,
        whatsapp_enabled=whatsapp_enabled,
        whatsapp_configured=whatsapp_configured,
        phone_number=phone,
        country_code=cc,
        notes=battery_state.get("notes") if battery_state else None,
    )


@router.get("/api/notifications/thresholds", response_model=ThresholdsResponse)
def get_user_thresholds(
    reserve: Optional[int] = Query(None, ge=5, le=40),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate and return the dynamic warning thresholds for a given or configured safety reserve.
    """
    target_reserve = reserve if reserve is not None else (current_user.default_safety_reserve or 10)
    thresholds = get_notification_thresholds(target_reserve)
    return ThresholdsResponse(
        safety_reserve=target_reserve,
        thresholds=thresholds,
        initial_warning=thresholds[0],
        critical_warning=thresholds[-1],
        explanation=(
            f"Initial warning starts at {thresholds[0]}% (reserve + 10%), "
            f"stepping down by 2% until reaching critical reserve at {thresholds[-1]}%."
        ),
    )


@router.get("/api/notifications/history", response_model=List[NotificationLogOut])
def get_notification_history(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Retrieve historical WhatsApp notification logs for the authenticated user.
    """
    cursor = db.notification_logs.find(
        {"user_id": str(current_user.id)}
    ).sort("created_at", -1).limit(limit)

    logs = []
    for doc in cursor:
        s_doc = serialize_doc(doc)
        logs.append(
            NotificationLogOut(
                id=s_doc["id"],
                phone_number=s_doc.get("phone_number"),
                battery_percentage=s_doc.get("battery_percentage"),
                triggered_threshold=s_doc.get("triggered_threshold"),
                notification_type=s_doc.get("notification_type", "unknown"),
                notification_status=s_doc.get("notification_status", "unknown"),
                provider=s_doc.get("provider", "simulation"),
                provider_message_id=s_doc.get("provider_message_id"),
                message_body=s_doc.get("message_body", ""),
                created_at=s_doc.get("created_at") or datetime.utcnow(),
            )
        )
    return logs


@router.post("/api/notifications/test", response_model=TestNotificationResponse)
def trigger_test_notification(
    current_user: User = Depends(get_current_user),
):
    """
    Send a test WhatsApp message to verify the user's phone configuration and provider connectivity.
    """
    result = send_test_notification(current_user.id)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("detail", "Failed to dispatch test notification. Check phone number."),
        )
    return TestNotificationResponse(**result)
