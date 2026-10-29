"""
Smart EV – Intelligent Charging & Range Planner
FastAPI Backend Application (MongoDB Powered)
Manual Input – No Image Analysis / No OCR
"""

import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.mongodb import init_mongodb, close_mongodb, check_mongodb_connection
from app.api import auth, vehicles, journeys, charging_stations, notifications

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("smart-ev")


# ─────────────────────────────────────────────
# Startup / Shutdown Lifespan
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⚡ Smart EV backend starting (manual input mode)...")

    # Initialize MongoDB connection & indexes
    init_mongodb()

    yield

    logger.info("Smart EV backend shutting down.")
    close_mongodb()


# ─────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────
app = FastAPI(
    title="Smart EV API",
    description=(
        "Intelligent Charging & Range Planner – REST API with MongoDB.\n\n"
        "Manual Input Range Planning. No OCR. No Image Analysis.\n\n"
        "Know Your Range. Plan Your Journey. Drive Smarter."
    ),
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
allowed_origins = list(set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    *settings.cors_origins_list,
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# API Routers
# ─────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(journeys.router)
app.include_router(charging_stations.router)
app.include_router(notifications.router)


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
@app.get("/api/health")
def health_check(response: Response):
    db_connected, db_status = check_mongodb_connection()

    if not db_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "error",
            "database": "disconnected",
            "database_error": db_status,
            "mongodb_uri": settings.MONGODB_URI,
            "app": "Smart EV API",
        }

    return {
        "status": "ok",
        "database": "connected",
        "database_name": settings.MONGODB_DATABASE,
        "mongodb_uri": settings.MONGODB_URI,
        "app": "Smart EV API",
        "version": "2.1.0",
        "environment": settings.APP_ENV,
        "input_method": "manual",
        "input_method_detail": "manual_input",
        "ocr_enabled": False,
    }


@app.get("/")
def root():
    return {
        "message": "Smart EV API is running.",
        "docs": "/api/docs",
        "health": "/api/health",
        "input_method": "manual",
    }
