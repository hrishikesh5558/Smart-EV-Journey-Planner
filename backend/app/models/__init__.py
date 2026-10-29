"""Models package – manual input only, no OCR."""
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.journey import Journey

__all__ = ["User", "Vehicle", "Journey"]
