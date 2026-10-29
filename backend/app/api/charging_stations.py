from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/api/charging-stations", tags=["Charging Stations"])

# Demo fictional stations – clearly labelled as demonstration only
DEMO_STATIONS = [
    {
        "id": "demo-1",
        "name": "GreenCharge Station Alpha",
        "address": "123 Electric Avenue, City Centre",
        "distance_from_route_km": 2.1,
        "connector_types": ["CCS2", "CHAdeMO"],
        "max_power_kw": 150,
        "availability": "demonstration_only",
        "latitude": None,
        "longitude": None,
        "operator": "Demo Operator",
        "is_demo": True,
    },
    {
        "id": "demo-2",
        "name": "ChargePoint Hub Beta",
        "address": "456 EV Road, Tech Park",
        "distance_from_route_km": 5.4,
        "connector_types": ["Type 2", "CCS2"],
        "max_power_kw": 50,
        "availability": "demonstration_only",
        "latitude": None,
        "longitude": None,
        "operator": "Demo Operator",
        "is_demo": True,
    },
    {
        "id": "demo-3",
        "name": "Rapid Charge Delta",
        "address": "789 Volt Street, Business District",
        "distance_from_route_km": 8.7,
        "connector_types": ["CCS2"],
        "max_power_kw": 350,
        "availability": "demonstration_only",
        "latitude": None,
        "longitude": None,
        "operator": "Demo Operator",
        "is_demo": True,
    },
]


@router.get("")
def get_charging_stations(
    lat: float = None,
    lng: float = None,
    radius_km: float = 20,
    connector_type: str = None,
):
    """
    Returns charging stations near a location.
    
    Currently in DEMO MODE – no real charging station provider is configured.
    To enable real data, set OPENCHARGEMAP_API_KEY in your .env file.
    """
    api_key = settings.OPENCHARGEMAP_API_KEY

    if api_key:
        # Real integration placeholder – add OpenChargeMap or similar here
        return {
            "mode": "real",
            "note": "Real charging station provider configured but not yet integrated. "
                    "See backend/app/api/charging_stations.py to add integration.",
            "stations": [],
        }

    stations = DEMO_STATIONS
    if connector_type:
        stations = [s for s in stations if connector_type in s["connector_types"]]

    return {
        "mode": "demo",
        "notice": (
            "⚠️ DEMONSTRATION DATA ONLY. These are fictional charging stations "
            "for UI demonstration purposes. They do not represent real locations, "
            "real availability, or real prices. "
            "Configure OPENCHARGEMAP_API_KEY for real station data."
        ),
        "stations": stations,
    }
