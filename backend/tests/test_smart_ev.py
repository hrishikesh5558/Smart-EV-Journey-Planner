"""
Smart EV Backend Tests
======================
Manual Input Range Planning – No OCR, No Image Analysis.
Run with: pytest tests/ -v
"""

import sys
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
from app.main import app
from app.database.mongodb import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.services.range_service import analyze_journey

# ─────────────────────────────────────────────
# Test Database Setup (MongoDB)
# ─────────────────────────────────────────────

mongo_test_client = MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=2000)
test_db = mongo_test_client["smart_ev_test_db"]


def override_get_db():
    return test_db


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    test_db.users.delete_many({})
    test_db.vehicles.delete_many({})
    test_db.journeys.delete_many({})
    app.dependency_overrides[get_db] = override_get_db
    yield
    test_db.users.delete_many({})
    test_db.vehicles.delete_many({})
    test_db.journeys.delete_many({})
    app.dependency_overrides.clear()


client = TestClient(app)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def register_user(email="test@example.com", password="TestPass123", name="Test User"):
    return client.post("/api/auth/register", json={
        "full_name": name,
        "email": email,
        "password": password,
        "confirm_password": password,
        "accept_terms": True,
    })


def auth_headers(email="test@example.com", password="TestPass123", full_name="Test User"):
    resp = register_user(email, password, full_name)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


SAMPLE_VEHICLE = {
    "nickname": "My Test EV",
    "manufacturer": "Tesla",
    "model": "Model 3",
    "full_charge_range_km": 400.0,
    "battery_capacity_kwh": 75.0,
}


# ─────────────────────────────────────────────
# 1. Auth Tests
# ─────────────────────────────────────────────

class TestAuth:
    def test_register_success(self):
        resp = register_user()
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    def test_register_duplicate_email(self):
        register_user()
        resp = register_user()
        assert resp.status_code == 409

    def test_register_password_mismatch(self):
        resp = client.post("/api/auth/register", json={
            "full_name": "Test",
            "email": "test2@example.com",
            "password": "Password1",
            "confirm_password": "Different1",
            "accept_terms": True,
        })
        assert resp.status_code == 422

    def test_login_success(self):
        register_user()
        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self):
        register_user()
        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPassword",
        })
        assert resp.status_code == 401

    def test_get_me(self):
        headers = auth_headers()
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    def test_unauthenticated_protected_route(self):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401


# ─────────────────────────────────────────────
# 2. Password Hashing Tests
# ─────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        h = hash_password("mysecret")
        assert h != "mysecret"

    def test_verify_correct_password(self):
        h = hash_password("mysecret")
        assert verify_password("mysecret", h) is True

    def test_reject_wrong_password(self):
        h = hash_password("mysecret")
        assert verify_password("wrong", h) is False

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2


# ─────────────────────────────────────────────
# 3. Vehicle CRUD Tests
# ─────────────────────────────────────────────

class TestVehicles:
    def test_create_vehicle(self):
        headers = auth_headers()
        resp = client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["nickname"] == "My Test EV"

    def test_list_vehicles(self):
        headers = auth_headers()
        client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers)
        resp = client.get("/api/vehicles", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_get_vehicle_by_id(self):
        headers = auth_headers()
        created = client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers).json()
        vid = created["id"]
        resp = client.get(f"/api/vehicles/{vid}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == vid

    def test_update_vehicle(self):
        headers = auth_headers()
        created = client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers).json()
        vid = created["id"]
        resp = client.put(f"/api/vehicles/{vid}", json={"nickname": "Updated Name"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["nickname"] == "Updated Name"

    def test_delete_vehicle(self):
        headers = auth_headers()
        created = client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers).json()
        vid = created["id"]
        resp = client.delete(f"/api/vehicles/{vid}", headers=headers)
        assert resp.status_code == 204

    def test_user_isolation_vehicles(self):
        headers_a = auth_headers("a@example.com", "PasswordA1")
        headers_b = auth_headers("b@example.com", "PasswordB1", "User B")
        created = client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers_a).json()
        vid = created["id"]
        resp = client.get(f"/api/vehicles/{vid}", headers=headers_b)
        assert resp.status_code == 404


# ─────────────────────────────────────────────
# 4. Range Calculation Engine (Unit Tests)
# ─────────────────────────────────────────────

class TestRangeEngine:
    def test_specification_example_calculation(self):
        """
        Specification Example:
        Estimated remaining range = 250 km
        Current battery percentage = 80%
        Journey distance = 180 km
        Safety reserve = 15%

        Safety reserve distance = 250 * 15 / 100 = 37.5 km
        Usable range = 250 - 37.5 = 212.5 km
        Remaining journey margin = 212.5 - 180 = 32.5 km
        Result: Estimated range appears sufficient with the selected reserve.
        """
        result = analyze_journey(
            current_remaining_range_km=250.0,
            destination_distance_km=180.0,
            safety_reserve_percent=15.0,
        )
        assert result.reserve_distance_km == 37.5
        assert result.usable_range_km == 212.5
        assert result.remaining_margin_after_journey_km == 32.5
        assert result.is_sufficient is True
        assert result.result_status == "feasible"
        assert result.recommendation == "Your estimated driving range appears sufficient for this journey with the selected safety reserve."
        assert "Actual driving range depends on traffic" in result.disclaimer

    def test_insufficient_range_calculation(self):
        """
        Insufficient scenario:
        Estimated range = 100 km, Journey = 120 km, Reserve = 15%
        Reserve distance = 15 km, Usable range = 85 km, Margin = 85 - 120 = -35 km
        """
        result = analyze_journey(
            current_remaining_range_km=100.0,
            destination_distance_km=120.0,
            safety_reserve_percent=15.0,
        )
        assert result.reserve_distance_km == 15.0
        assert result.usable_range_km == 85.0
        assert result.remaining_margin_after_journey_km == -35.0
        assert result.is_sufficient is False
        assert result.result_status == "charging_recommended"
        assert result.recommendation == "Charging before departure or planning a charging stop is recommended."

    def test_negative_distance_rejected(self):
        with pytest.raises(ValueError):
            analyze_journey(current_remaining_range_km=200, destination_distance_km=-50)

    def test_zero_distance_rejected(self):
        with pytest.raises(ValueError):
            analyze_journey(current_remaining_range_km=200, destination_distance_km=0)

    def test_negative_range_rejected(self):
        with pytest.raises(ValueError):
            analyze_journey(current_remaining_range_km=-10, destination_distance_km=50)


# ─────────────────────────────────────────────
# 5. Journey API Endpoints Tests
# ─────────────────────────────────────────────

class TestJourneyAPI:
    def test_calculate_endpoint_sufficient(self):
        headers = auth_headers()
        resp = client.post("/api/journeys/calculate", json={
            "current_battery_percentage": 80.0,
            "estimated_remaining_range_km": 250.0,
            "planned_journey_distance_km": 180.0,
            "reserve_percentage": 15.0,
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_battery_percentage"] == 80.0
        assert data["estimated_remaining_range_km"] == 250.0
        assert data["planned_journey_distance_km"] == 180.0
        assert data["reserve_percentage"] == 15.0
        assert data["reserve_distance_km"] == 37.5
        assert data["usable_range_km"] == 212.5
        assert data["remaining_margin_km"] == 32.5
        assert data["is_sufficient"] is True
        assert data["recommendation"] == "Your estimated driving range appears sufficient for this journey with the selected safety reserve."

    def test_calculate_endpoint_insufficient(self):
        headers = auth_headers()
        resp = client.post("/api/journeys/calculate", json={
            "current_battery_percentage": 30.0,
            "estimated_remaining_range_km": 80.0,
            "planned_journey_distance_km": 100.0,
            "reserve_percentage": 15.0,
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_sufficient"] is False
        assert data["recommendation"] == "Charging before departure or planning a charging stop is recommended."

    def test_calculate_validation_errors(self):
        headers = auth_headers()
        # Battery percentage > 100 rejected
        r1 = client.post("/api/journeys/calculate", json={
            "current_battery_percentage": 105.0,
            "estimated_remaining_range_km": 200.0,
            "planned_journey_distance_km": 100.0,
        }, headers=headers)
        assert r1.status_code == 422

        # Negative distance rejected
        r2 = client.post("/api/journeys/calculate", json={
            "estimated_remaining_range_km": 200.0,
            "planned_journey_distance_km": -10.0,
        }, headers=headers)
        assert r2.status_code == 422

        # Negative range rejected
        r3 = client.post("/api/journeys/calculate", json={
            "estimated_remaining_range_km": -20.0,
            "planned_journey_distance_km": 100.0,
        }, headers=headers)
        assert r3.status_code == 422

    def test_save_and_retrieve_journey(self):
        headers = auth_headers()
        # Create vehicle first
        v = client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers).json()
        vid = v["id"]

        save_resp = client.post("/api/journeys/save", json={
            "vehicle_id": vid,
            "manufacturer": "Tesla",
            "model": "Model 3",
            "battery_capacity_kwh": 75.0,
            "current_battery_percentage": 80.0,
            "estimated_remaining_range_km": 250.0,
            "starting_location": "Mumbai",
            "destination": "Pune",
            "journey_distance_km": 180.0,
            "reserve_percentage": 15.0,
            "notes": "Weekend drive",
        }, headers=headers)
        assert save_resp.status_code == 201
        saved = save_resp.json()
        journey = saved["journey"]
        jid = journey["id"]

        assert journey["current_battery_percentage"] == 80.0
        assert journey["estimated_remaining_range_km"] == 250.0
        assert journey["journey_distance_km"] == 180.0
        assert journey["reserve_distance_km"] == 37.5
        assert journey["usable_range_km"] == 212.5
        assert journey["remaining_margin_km"] == 32.5
        assert journey["recommendation"] == "Your estimated driving range appears sufficient for this journey with the selected safety reserve."

        # Verify list / history
        hist_resp = client.get("/api/journeys/history", headers=headers)
        assert hist_resp.status_code == 200
        history_items = hist_resp.json()
        assert len(history_items) == 1
        assert history_items[0]["id"] == jid

        # Verify get single
        get_resp = client.get(f"/api/journeys/{jid}", headers=headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == jid

        # Delete journey
        del_resp = client.delete(f"/api/journeys/{jid}", headers=headers)
        assert del_resp.status_code == 204

        # Verify 404 after deletion
        assert client.get(f"/api/journeys/{jid}", headers=headers).status_code == 404

    def test_user_journey_isolation(self):
        ha = auth_headers("user_a@example.com", "Password1a")
        hb = auth_headers("user_b@example.com", "Password1b", "User B")

        save_resp = client.post("/api/journeys/save", json={
            "current_battery_percentage": 70.0,
            "estimated_remaining_range_km": 200.0,
            "destination": "City A",
            "journey_distance_km": 100.0,
            "reserve_percentage": 15.0,
        }, headers=ha).json()
        jid = save_resp["journey"]["id"]

        # User B cannot see User A's journey
        get_b = client.get(f"/api/journeys/{jid}", headers=hb)
        assert get_b.status_code == 404

        # User B cannot delete User A's journey
        del_b = client.delete(f"/api/journeys/{jid}", headers=hb)
        assert del_b.status_code == 404

        # User B's history is empty
        hist_b = client.get("/api/journeys/history", headers=hb)
        assert hist_b.status_code == 200
        assert len(hist_b.json()) == 0

    def test_dashboard_stats_summary(self):
        headers = auth_headers()
        client.post("/api/vehicles", json=SAMPLE_VEHICLE, headers=headers)
        client.post("/api/journeys/save", json={
            "current_battery_percentage": 85.0,
            "estimated_remaining_range_km": 300.0,
            "destination": "Beach",
            "journey_distance_km": 150.0,
            "reserve_percentage": 15.0,
        }, headers=headers)

        resp = client.get("/api/journeys/stats/summary", headers=headers)
        assert resp.status_code == 200
        stats = resp.json()
        assert stats["total_vehicles"] == 1
        assert stats["total_journeys"] == 1
        assert stats["feasible_journeys"] == 1
        assert stats["charging_recommended_journeys"] == 0
        assert len(stats["recent_journeys"]) == 1
