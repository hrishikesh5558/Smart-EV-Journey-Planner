from datetime import datetime
from typing import Optional, Any


class Vehicle:
    """MongoDB Vehicle entity representation."""

    def __init__(
        self,
        id: str = "",
        user_id: str = "",
        nickname: str = "",
        manufacturer: str = "",
        model: str = "",
        model_year: Optional[int] = None,
        battery_capacity_kwh: Optional[float] = None,
        full_charge_range_km: float = 0.0,
        registration_identifier: Optional[str] = None,
        image_reference: Optional[str] = None,
        image_path: Optional[str] = None,
        notes: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **kwargs: Any,
    ):
        self.id = str(id or kwargs.get("_id") or "")
        self.user_id = str(user_id)
        self.nickname = nickname
        self.manufacturer = manufacturer
        self.model = model
        self.model_year = model_year
        self.battery_capacity_kwh = battery_capacity_kwh
        self.full_charge_range_km = full_charge_range_km
        self.registration_identifier = registration_identifier
        self.image_reference = image_reference or image_path
        self.image_path = image_path or image_reference
        self.notes = notes
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_doc(cls, doc: dict) -> "Vehicle":
        return cls(
            id=str(doc.get("_id") or doc.get("id") or ""),
            user_id=str(doc.get("user_id", "")),
            nickname=doc.get("nickname", ""),
            manufacturer=doc.get("manufacturer", ""),
            model=doc.get("model", ""),
            model_year=doc.get("model_year"),
            battery_capacity_kwh=doc.get("battery_capacity_kwh"),
            full_charge_range_km=doc.get("full_charge_range_km", 0.0),
            registration_identifier=doc.get("registration_identifier"),
            image_reference=doc.get("image_reference") or doc.get("image_path"),
            image_path=doc.get("image_path") or doc.get("image_reference"),
            notes=doc.get("notes"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )
