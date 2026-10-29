from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from app.database.mongodb import get_db, serialize_doc, to_object_id
from app.models.user import User
from app.schemas.user import (
    UserRegister, UserLogin, UserOut, TokenResponse,
    RefreshTokenRequest, ChangePasswordRequest, UpdateProfileRequest
)
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)

router = APIRouter(tags=["Authentication"])


def _to_user_out(user) -> UserOut:
    if isinstance(user, User):
        uid = user.id
        full_name = user.full_name
        email = user.email
        reserve = user.default_safety_reserve
        unit = user.preferred_unit
        phone = user.phone_number
        cc = user.country_code or "+91"
        whatsapp_enabled = bool(user.whatsapp_enabled)
        created_at = user.created_at
    elif isinstance(user, dict):
        uid = str(user.get("_id") or user.get("id") or "")
        full_name = user.get("full_name", "")
        email = user.get("email", "")
        reserve = user.get("default_safety_reserve", 10)
        unit = user.get("preferred_unit", "km")
        phone = user.get("phone_number")
        cc = user.get("country_code", "+91")
        whatsapp_enabled = bool(user.get("whatsapp_enabled", False))
        created_at = user.get("created_at") or datetime.utcnow()
    else:
        raise ValueError("Invalid user type")

    whatsapp_configured = bool(phone and len(phone) >= 7 and whatsapp_enabled)
    return UserOut(
        id=uid,
        full_name=full_name,
        email=email,
        default_safety_reserve=reserve,
        preferred_unit=unit,
        phone_number=phone,
        country_code=cc,
        whatsapp_enabled=whatsapp_enabled,
        whatsapp_configured=whatsapp_configured,
        created_at=created_at,
    )


@router.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db=Depends(get_db)):
    norm_email = payload.email.lower().strip()
    existing = db.users.find_one({"email": norm_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    now = datetime.utcnow()
    user_doc = {
        "full_name": payload.full_name.strip(),
        "email": norm_email,
        "password_hash": hash_password(payload.password),
        "is_active": True,
        "default_safety_reserve": 10,
        "preferred_unit": "km",
        "phone_number": None,
        "country_code": "+91",
        "whatsapp_enabled": False,
        "created_at": now,
        "updated_at": now,
    }
    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    user_out = _to_user_out(user_doc)
    user_out.id = user_id

    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out,
    )


@router.post("/api/auth/login", response_model=TokenResponse)
def login(payload: UserLogin, db=Depends(get_db)):
    norm_email = payload.email.lower().strip()
    user_doc = db.users.find_one({"email": norm_email})
    if not user_doc or not verify_password(payload.password, user_doc.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    user_id = str(user_doc["_id"])
    user_out = _to_user_out(user_doc)

    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out,
    )


@router.post("/api/auth/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db=Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )
    user_id = decoded.get("sub")
    user_doc = db.users.find_one({"_id": to_object_id(user_id)})
    if not user_doc or not user_doc.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    user_out = _to_user_out(user_doc)
    new_access = create_access_token({"sub": str(user_doc["_id"])})
    new_refresh = create_refresh_token({"sub": str(user_doc["_id"])})

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user=user_out,
    )


@router.get("/api/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.post("/api/auth/logout")
def logout():
    return {"message": "Logged out successfully. Please clear your tokens client-side."}


# Support both /api/profile and /api/auth/profile
@router.get("/api/profile", response_model=UserOut)
@router.get("/api/auth/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.put("/api/profile", response_model=UserOut)
@router.put("/api/auth/profile", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    updates = {"updated_at": datetime.utcnow()}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name
        current_user.full_name = payload.full_name
    if payload.default_safety_reserve is not None:
        updates["default_safety_reserve"] = payload.default_safety_reserve
        current_user.default_safety_reserve = payload.default_safety_reserve
    if payload.preferred_unit is not None:
        updates["preferred_unit"] = payload.preferred_unit
        current_user.preferred_unit = payload.preferred_unit
    if payload.phone_number is not None:
        updates["phone_number"] = payload.phone_number
        current_user.phone_number = payload.phone_number
    if payload.country_code is not None:
        updates["country_code"] = payload.country_code
        current_user.country_code = payload.country_code
    if payload.whatsapp_enabled is not None:
        updates["whatsapp_enabled"] = payload.whatsapp_enabled
        current_user.whatsapp_enabled = payload.whatsapp_enabled

    db.users.update_one({"_id": to_object_id(current_user.id)}, {"$set": updates})
    return _to_user_out(current_user)


@router.post("/api/auth/change-password")
@router.put("/api/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    user_doc = db.users.find_one({"_id": to_object_id(current_user.id)})
    if not user_doc or not verify_password(payload.current_password, user_doc.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    db.users.update_one(
        {"_id": to_object_id(current_user.id)},
        {"$set": {"password_hash": hash_password(payload.new_password), "updated_at": datetime.utcnow()}}
    )
    return {"message": "Password changed successfully."}
