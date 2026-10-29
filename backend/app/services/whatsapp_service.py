"""
Smart EV WhatsApp Notification Service
======================================
Automated WhatsApp alerts when EV battery approaches user's configured safety reserve.

Features:
- Dynamic threshold generation based on user's configured safety reserve.
  Formula: Initial warning = reserve + 10%, step down by 2% down to reserve.
- Battery discharge & charge tracking.
- Duplicate suppression and multi-threshold jump consolidation.
- Charge reset: resets notified threshold when battery increases by >= 3%.
- Multiple dispatch providers: Meta Cloud API, Twilio, and structured Simulation mode.
- Audit trail logging in MongoDB `notification_logs`.
"""

import logging
import uuid
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import requests

from app.core.config import settings
from app.database.mongodb import get_db, serialize_doc, to_object_id

logger = logging.getLogger("smart-ev.whatsapp")


def get_notification_thresholds(reserve_pct: int) -> List[int]:
    """
    Generate dynamic warning thresholds based on user's safety reserve.
    Formula:
      - Initial warning: reserve + 10%
      - Subsequent warnings: step down by 2% down to reserve%
      
    Example:
      reserve = 10 -> [20, 18, 16, 14, 12, 10]
      reserve = 15 -> [25, 23, 21, 19, 17, 15]
      reserve = 20 -> [30, 28, 26, 24, 22, 20]
    """
    # Clamp safety reserve between 5% and 40%
    clamped_reserve = max(5, min(40, int(reserve_pct)))
    initial_warning = clamped_reserve + 10
    
    thresholds = []
    curr = initial_warning
    while curr >= clamped_reserve:
        thresholds.append(curr)
        curr -= 2
    return thresholds


def format_recipient_phone(phone_number: str, country_code: str = "+91") -> str:
    """Format phone number with country code into E.164 format (+1234567890)."""
    cleaned = re.sub(r"[\s\-\(\)]", "", phone_number or "")
    if cleaned.startswith("+"):
        return cleaned
    
    # Strip any leading zeros
    cleaned = cleaned.lstrip("0")
    cc = country_code.strip() if country_code else "+91"
    if not cc.startswith("+"):
        cc = "+" + cc
    return f"{cc}{cleaned}"


def resolve_provider() -> str:
    """Determine active WhatsApp provider based on config and credentials."""
    configured = (settings.WHATSAPP_PROVIDER or "").lower().strip()
    if configured in ("meta", "twilio", "simulation"):
        if configured == "meta" and settings.WHATSAPP_META_PHONE_NUMBER_ID and settings.WHATSAPP_META_ACCESS_TOKEN:
            return "meta"
        if configured == "twilio" and settings.WHATSAPP_TWILIO_ACCOUNT_SID and settings.WHATSAPP_TWILIO_AUTH_TOKEN:
            return "twilio"
        if configured == "simulation":
            return "simulation"
    
    # Auto-detect if credentials exist
    if settings.WHATSAPP_META_PHONE_NUMBER_ID and settings.WHATSAPP_META_ACCESS_TOKEN:
        return "meta"
    if settings.WHATSAPP_TWILIO_ACCOUNT_SID and settings.WHATSAPP_TWILIO_AUTH_TOKEN:
        return "twilio"
    return "simulation"


def send_whatsapp_message(
    phone_e164: str,
    message: str,
    provider: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Dispatch WhatsApp message via active provider (Meta, Twilio, or Simulation).
    """
    active_provider = provider or resolve_provider()
    provider_msg_id = None
    status = "sent"
    error_detail = None

    try:
        if active_provider == "meta":
            # Meta WhatsApp Cloud API
            url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_META_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_META_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            }
            # Meta requires digits without '+' for recipient
            recipient_digits = phone_e164.lstrip("+")
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": recipient_digits,
                "type": "text",
                "text": {"preview_url": False, "body": message},
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()
                messages = data.get("messages", [])
                provider_msg_id = messages[0].get("id") if messages else f"meta-{uuid.uuid4().hex[:8]}"
            else:
                status = "failed"
                error_detail = f"Meta API error {resp.status_code}: {resp.text}"
                logger.error(f"WhatsApp Meta API failed: {error_detail}")

        elif active_provider == "twilio":
            # Twilio WhatsApp API
            account_sid = settings.WHATSAPP_TWILIO_ACCOUNT_SID
            auth_token = settings.WHATSAPP_TWILIO_AUTH_TOKEN
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            from_number = settings.WHATSAPP_TWILIO_FROM
            if not from_number.startswith("whatsapp:"):
                from_number = f"whatsapp:{from_number}"
            to_number = f"whatsapp:{phone_e164}"
            
            resp = requests.post(
                url,
                data={"From": from_number, "To": to_number, "Body": message},
                auth=(account_sid, auth_token),
                timeout=10,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                provider_msg_id = data.get("sid", f"tw-{uuid.uuid4().hex[:8]}")
            else:
                status = "failed"
                error_detail = f"Twilio API error {resp.status_code}: {resp.text}"
                logger.error(f"WhatsApp Twilio API failed: {error_detail}")

        else:
            # Simulation mode
            status = "simulated"
            provider_msg_id = f"sim-{uuid.uuid4().hex[:12]}"
            logger.info(
                f"[WHATSAPP SIMULATION] To: {phone_e164} | ID: {provider_msg_id}\n"
                f"--------------------------------------------------\n"
                f"{message}\n"
                f"--------------------------------------------------"
            )

    except Exception as exc:
        status = "failed"
        error_detail = str(exc)
        logger.error(f"WhatsApp dispatch exception: {exc}")

    return {
        "status": status,
        "provider": active_provider,
        "provider_message_id": provider_msg_id,
        "error_detail": error_detail,
        "recipient": phone_e164,
        "message": message,
    }


def evaluate_and_notify_battery(
    user_id: str,
    current_battery: float,
    vehicle_id: Optional[str] = None,
    notes: Optional[str] = None,
    force_test: bool = False,
) -> Dict[str, Any]:
    """
    Evaluates battery level against user's dynamic safety reserve thresholds.
    Handles duplicate suppression, multi-threshold jump consolidation, and charge resets.
    Persists updated state and notification audit logs into MongoDB.
    """
    db = get_db()
    current_battery = round(float(current_battery), 1)

    # 1. Fetch user settings
    user_oid = to_object_id(user_id)
    user_filter = {"_id": user_oid} if user_oid else {"id": user_id}
    user_doc = db.users.find_one(user_filter)
    if not user_doc:
        return {"success": False, "detail": "User not found."}

    reserve = int(user_doc.get("default_safety_reserve", 10))
    thresholds = get_notification_thresholds(reserve)
    initial_threshold = thresholds[0]
    critical_threshold = thresholds[-1]

    phone_number = user_doc.get("phone_number")
    country_code = user_doc.get("country_code", "+91")
    whatsapp_enabled = bool(user_doc.get("whatsapp_enabled", False))
    phone_e164 = format_recipient_phone(phone_number, country_code) if phone_number else None

    # 2. Fetch existing battery state
    state_filter = {"user_id": str(user_id)}
    if vehicle_id:
        state_filter["vehicle_id"] = str(vehicle_id)
    battery_state = db.battery_states.find_one(state_filter)

    prev_battery = None
    last_notified_threshold = None
    if battery_state:
        prev_battery = battery_state.get("battery_percentage")
        last_notified_threshold = battery_state.get("last_threshold_notified")

    notification_triggered = False
    notification_type = None
    triggered_threshold = None
    message_body = None
    notification_result = None

    # 3. Charging check (Reset rule)
    # If battery increased by >= 3%, user has charged vehicle -> reset last_notified_threshold
    charge_reset_applied = False
    if prev_battery is not None and (current_battery >= prev_battery + 3.0):
        charge_reset_applied = True
        last_notified_threshold = None
        logger.info(
            f"User {user_id} battery increased from {prev_battery}% to {current_battery}% "
            f"(+{current_battery - prev_battery}%). Resetting alert threshold state."
        )

    # 4. Threshold evaluation
    if not force_test:
        # Determine crossed thresholds
        crossed: List[int] = []
        for t in thresholds:
            # Threshold is triggered if current battery is at or below t
            if current_battery <= t:
                # And we haven't already notified at or below this threshold during the current discharge cycle
                if last_notified_threshold is None or t < last_notified_threshold:
                    crossed.append(t)

        if crossed:
            notification_triggered = True
            # Check if multiple thresholds were crossed in a single drop (multi-threshold jump)
            if len(crossed) > 1:
                notification_type = "multi_threshold"
                triggered_threshold = min(crossed)
                prev_text = f"from {prev_battery}% " if prev_battery is not None else ""
                message_body = (
                    f"Smart EV Multi-Level Alert: Your vehicle battery dropped {prev_text}to {current_battery}%, "
                    f"crossing multiple safety thresholds down to {triggered_threshold}%. "
                    f"Your configured safety reserve is {reserve}%. "
                    f"Charging is urgently recommended to prevent stranding."
                )
            else:
                triggered_threshold = crossed[0]
                if triggered_threshold == critical_threshold:
                    notification_type = "critical"
                    message_body = (
                        f"Smart EV Critical Alert: Your battery has reached your configured "
                        f"{reserve}% safety reserve (Current: {current_battery}%). "
                        f"Charging is strongly recommended immediately."
                    )
                elif triggered_threshold == initial_threshold:
                    notification_type = "initial"
                    message_body = (
                        f"Smart EV Alert: Your vehicle battery is at {current_battery}%. "
                        f"Your configured safety reserve is {reserve}%. "
                        f"Please consider planning a charging stop."
                    )
                else:
                    notification_type = "reminder"
                    message_body = (
                        f"Smart EV Reminder: Your battery is now at {current_battery}%. "
                        f"Your available range is decreasing. "
                        f"Please check your journey requirements and nearby charging options."
                    )

    # 5. Dispatch notification if triggered and user configured WhatsApp
    now = datetime.utcnow()
    if notification_triggered and message_body:
        if whatsapp_enabled and phone_e164:
            notification_result = send_whatsapp_message(phone_e164, message_body)
            # Log into notification_logs
            log_doc = {
                "user_id": str(user_id),
                "vehicle_id": str(vehicle_id) if vehicle_id else None,
                "phone_number": phone_e164,
                "battery_percentage": current_battery,
                "triggered_threshold": triggered_threshold,
                "notification_type": notification_type,
                "notification_status": notification_result["status"],
                "provider": notification_result["provider"],
                "provider_message_id": notification_result["provider_message_id"],
                "message_body": message_body,
                "error_detail": notification_result["error_detail"],
                "created_at": now,
            }
            db.notification_logs.insert_one(log_doc)
            last_notified_threshold = triggered_threshold
        else:
            notification_result = {
                "status": "skipped",
                "reason": "WhatsApp alerts disabled or phone number not set in Settings.",
                "message": message_body,
            }

    # 6. Update battery_states in MongoDB
    new_state = {
        "user_id": str(user_id),
        "vehicle_id": str(vehicle_id) if vehicle_id else None,
        "battery_percentage": current_battery,
        "last_threshold_notified": last_notified_threshold,
        "last_updated": now,
        "notes": notes,
    }
    db.battery_states.update_one(
        state_filter,
        {"$set": new_state},
        upsert=True,
    )

    return {
        "success": True,
        "battery_percentage": current_battery,
        "previous_battery_percentage": prev_battery,
        "charge_reset_applied": charge_reset_applied,
        "safety_reserve": reserve,
        "active_thresholds": thresholds,
        "notification_triggered": notification_triggered,
        "notification_type": notification_type,
        "triggered_threshold": triggered_threshold,
        "last_notified_threshold": last_notified_threshold,
        "whatsapp_configured": bool(whatsapp_enabled and phone_e164),
        "notification_result": notification_result,
        "message": (
            message_body or (
                "Battery reading updated. No alert thresholds crossed." if not charge_reset_applied
                else "Battery reading updated. Charging detected; alert thresholds reset."
            )
        ),
    }


def send_test_notification(user_id: str) -> Dict[str, Any]:
    """Send an immediate test alert to verify the user's phone number configuration."""
    db = get_db()
    user_oid = to_object_id(user_id)
    user_filter = {"_id": user_oid} if user_oid else {"id": user_id}
    user_doc = db.users.find_one(user_filter)
    if not user_doc:
        return {"success": False, "detail": "User not found."}

    phone_number = user_doc.get("phone_number")
    country_code = user_doc.get("country_code", "+91")
    whatsapp_enabled = bool(user_doc.get("whatsapp_enabled", False))

    if not phone_number:
        return {
            "success": False,
            "detail": "Please save a valid phone number in Settings before sending a test alert.",
        }

    phone_e164 = format_recipient_phone(phone_number, country_code)
    reserve = int(user_doc.get("default_safety_reserve", 10))
    thresholds = get_notification_thresholds(reserve)
    thresholds_str = ", ".join(f"{t}%" for t in thresholds)

    test_message = (
        f"Smart EV Test Alert: Your WhatsApp notifications are successfully configured! "
        f"You will automatically receive alerts when your battery reaches: {thresholds_str} "
        f"(configured safety reserve: {reserve}%)."
    )

    result = send_whatsapp_message(phone_e164, test_message)

    # Log into notification_logs
    log_doc = {
        "user_id": str(user_id),
        "vehicle_id": None,
        "phone_number": phone_e164,
        "battery_percentage": None,
        "triggered_threshold": None,
        "notification_type": "test",
        "notification_status": result["status"],
        "provider": result["provider"],
        "provider_message_id": result["provider_message_id"],
        "message_body": test_message,
        "error_detail": result["error_detail"],
        "created_at": datetime.utcnow(),
    }
    db.notification_logs.insert_one(log_doc)

    return {
        "success": result["status"] in ("sent", "simulated"),
        "status": result["status"],
        "provider": result["provider"],
        "recipient": phone_e164,
        "message": test_message,
        "error_detail": result["error_detail"],
    }
