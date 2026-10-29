from datetime import datetime
from typing import Optional, Any


class User:
    """MongoDB User entity representation."""

    def __init__(
        self,
        id: str = "",
        full_name: str = "",
        email: str = "",
        password_hash: str = "",
        is_active: bool = True,
        default_safety_reserve: int = 10,
        preferred_unit: str = "km",
        phone_number: Optional[str] = None,
        country_code: Optional[str] = "+91",
        whatsapp_enabled: bool = False,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **kwargs: Any,
    ):
        self.id = str(id or kwargs.get("_id") or "")
        self.full_name = full_name
        self.email = email.lower()
        self.password_hash = password_hash
        self.is_active = is_active
        self.default_safety_reserve = default_safety_reserve
        self.preferred_unit = preferred_unit
        self.phone_number = phone_number
        self.country_code = country_code or "+91"
        self.whatsapp_enabled = whatsapp_enabled
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_doc(cls, doc: dict) -> "User":
        if not doc:
            raise ValueError("Document cannot be empty")
        doc_id = str(doc.get("_id") or doc.get("id") or "")
        return cls(
            id=doc_id,
            full_name=doc.get("full_name", ""),
            email=doc.get("email", ""),
            password_hash=doc.get("password_hash", ""),
            is_active=doc.get("is_active", True),
            default_safety_reserve=doc.get("default_safety_reserve", 10),
            preferred_unit=doc.get("preferred_unit", "km"),
            phone_number=doc.get("phone_number"),
            country_code=doc.get("country_code", "+91"),
            whatsapp_enabled=doc.get("whatsapp_enabled", False),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )

    def to_doc(self) -> dict:
        return {
            "full_name": self.full_name,
            "email": self.email,
            "password_hash": self.password_hash,
            "is_active": self.is_active,
            "default_safety_reserve": self.default_safety_reserve,
            "preferred_unit": self.preferred_unit,
            "phone_number": self.phone_number,
            "country_code": self.country_code,
            "whatsapp_enabled": self.whatsapp_enabled,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
