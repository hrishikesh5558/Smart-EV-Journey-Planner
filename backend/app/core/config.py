"""
Smart EV Configuration – Manual Input Mode.
No OCR, Tesseract, or image analysis settings.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_SECRET_KEY: str = "dev-secret-key-smart-ev-change-in-production"
    APP_ENV: str = "development"
    DEBUG: bool = True

    MONGODB_URI: str = "mongodb://127.0.0.1:27017"
    MONGODB_DATABASE: str = "smart_ev_db"

    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    FRONTEND_ORIGIN: str = ""

    JWT_SECRET_KEY: str = ""

    MAP_PROVIDER: str = "google"
    GOOGLE_MAPS_API_KEY: str = ""

    OPENCHARGEMAP_API_KEY: str = ""

    # WhatsApp Alert Configuration
    WHATSAPP_PROVIDER: str = "simulation"  # "simulation", "meta", "twilio", or "auto"
    WHATSAPP_META_PHONE_NUMBER_ID: str = ""
    WHATSAPP_META_ACCESS_TOKEN: str = ""
    WHATSAPP_TWILIO_ACCOUNT_SID: str = ""
    WHATSAPP_TWILIO_AUTH_TOKEN: str = ""
    WHATSAPP_TWILIO_FROM: str = "whatsapp:+14155238886"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def secret_key(self) -> str:
        return self.JWT_SECRET_KEY or self.APP_SECRET_KEY

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN.strip():
            for origin in self.FRONTEND_ORIGIN.split(","):
                clean = origin.strip()
                if clean and clean not in origins:
                    origins.append(clean)
        return origins

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
