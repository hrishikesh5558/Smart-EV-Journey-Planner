"""
Live End-to-End HTTP Integration Test for Smart EV.
Tests the actual running FastAPI backend and MongoDB service at http://127.0.0.1:8000
Manual Input Range Planning – No OCR.
"""

import sys
import uuid
import httpx

BASE_URL = "http://127.0.0.1:8000"


def run_test():
    client = httpx.Client(timeout=30.0)

    print("[1] Health check...")
    r = client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    assert health_data.get("database") == "connected"
    print(f"    Health OK: database={health_data.get('database')} input_method={health_data.get('input_method')}")

    unique_id = uuid.uuid4().hex[:8]
    test_email = f"e2e_driver_{unique_id}@smartev.com"
    test_password = "SecureE2EPass123!"

    print("\n[2] User Registration...")
    reg_payload = {
        "full_name": "E2E Test Driver",
        "email": test_email,
        "password": test_password,
        "confirm_password": test_password,
        "accept_terms": True,
    }
    r = client.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert r.status_code in [200, 201], f"Registration failed: {r.text}"
    print("    Registration successful.")

    print("\n[3] Duplicate Registration Rejection...")
    r = client.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert r.status_code in [400, 409], f"Expected 400 or 409 for duplicate email, got: {r.status_code}"
    print(f"    Duplicate email correctly rejected with {r.status_code}.")

    print("\n[4] User Login...")
    login_payload = {
        "email": test_email,
        "password": test_password,
    }
    r = client.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.text}"
    login_data = r.json()
    token = login_data["access_token"]
    assert token, "No access token returned"
    client.headers.update({"Authorization": f"Bearer {token}"})
    print(f"    Login successful. Token acquired ({token[:15]}...).")

    print("\n[5] Current User Profile Verification...")
    r = client.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == test_email
    print(f"    User profile: {r.json()['full_name']} ({r.json()['email']})")

    print("\n[6] Vehicle Management in Garage...")
    vehicle_payload = {
        "nickname": "Daily Tesla",
        "manufacturer": "Tesla",
        "model": "Model 3",
        "model_year": 2023,
        "battery_capacity_kwh": 75.0,
        "full_charge_range_km": 490.0,
        "registration_identifier": "EV-9999-E2E",
        "notes": "Long Range AWD test vehicle",
    }
    r = client.post(f"{BASE_URL}/api/vehicles", json=vehicle_payload)
    assert r.status_code in [200, 201], f"Create vehicle failed: {r.text}"
    vehicle = r.json()
    vehicle_id = vehicle.get("id") or vehicle.get("_id")
    assert vehicle_id, "No vehicle ID returned"
    assert vehicle["registration_identifier"] == "EV-9999-E2E"
    print(f"    Vehicle created: {vehicle['nickname']} (ID: {vehicle_id})")

    # List vehicles
    r = client.get(f"{BASE_URL}/api/vehicles")
    assert r.status_code == 200
    vehicles = r.json()
    assert any((v.get("id") or v.get("_id")) == vehicle_id for v in vehicles)
    print(f"    Listed {len(vehicles)} vehicles in user garage.")

    print("\n[7] Manual Range Sufficiency Calculation Engine (/api/journeys/calculate)...")
    # Test case 1: 250 km range, 180 km journey, 15% reserve
    # Reserve dist = 250 * 0.15 = 37.5 km -> Usable range = 212.5 km. 180 <= 212.5 -> Sufficient! Margin = 32.5 km
    calc_req_1 = {
        "current_battery_percentage": 80.0,
        "estimated_remaining_range_km": 250.0,
        "planned_journey_distance_km": 180.0,
        "reserve_percentage": 15.0,
    }
    r = client.post(f"{BASE_URL}/api/journeys/calculate", json=calc_req_1)
    assert r.status_code == 200, f"Calculate 1 failed: {r.text}"
    res_1 = r.json()
    assert res_1["is_sufficient"] is True
    assert res_1["usable_range_km"] == 212.5
    assert res_1["reserve_distance_km"] == 37.5
    assert res_1["remaining_margin_km"] == 32.5
    assert "sufficient" in res_1["recommendation"].lower()
    print(f"    Test 1 (Sufficient): Usable={res_1['usable_range_km']} km, Margin={res_1['remaining_margin_km']} km")

    # Test case 2: 120 km range, 150 km journey, 10% reserve -> Insufficient
    calc_req_2 = {
        "current_battery_percentage": 35.0,
        "estimated_remaining_range_km": 120.0,
        "planned_journey_distance_km": 150.0,
        "reserve_percentage": 10.0,
    }
    r = client.post(f"{BASE_URL}/api/journeys/calculate", json=calc_req_2)
    assert r.status_code == 200, f"Calculate 2 failed: {r.text}"
    res_2 = r.json()
    assert res_2["is_sufficient"] is False
    assert "charging" in res_2["recommendation"].lower()
    print(f"    Test 2 (Insufficient): Usable={res_2['usable_range_km']} km, Margin={res_2['remaining_margin_km']} km")

    print("\n[8] Save Journey to MongoDB (/api/journeys/save)...")
    journey_save_payload = {
        "vehicle_id": vehicle_id,
        "manufacturer": "Tesla",
        "model": "Model 3",
        "battery_capacity_kwh": 75.0,
        "current_battery_percentage": 80.0,
        "estimated_remaining_range_km": 250.0,
        "starting_location": "San Francisco, CA",
        "destination": "San Jose, CA",
        "journey_distance_km": 180.0,
        "reserve_percentage": 15.0,
        "notes": "Route via I-280 S with normal conditions",
    }
    r = client.post(f"{BASE_URL}/api/journeys/save", json=journey_save_payload)
    assert r.status_code in [200, 201], f"Save journey failed: {r.text}"
    saved_journey_data = r.json()
    saved_journey = saved_journey_data.get("journey") or saved_journey_data
    journey_id = saved_journey.get("id") or saved_journey.get("_id")
    assert journey_id, "No journey ID returned"
    print(f"    Journey saved to MongoDB: ID={journey_id} (Status: {saved_journey.get('result_status')})")

    # Verify history
    r = client.get(f"{BASE_URL}/api/journeys/history")
    assert r.status_code == 200
    journeys = r.json()
    assert any((j.get("id") or j.get("_id")) == journey_id for j in journeys)
    print(f"    Journey found in user history list ({len(journeys)} total).")

    # Get single journey
    r = client.get(f"{BASE_URL}/api/journeys/{journey_id}")
    assert r.status_code == 200
    assert (r.json().get("id") or r.json().get("_id")) == journey_id
    print("    Single journey GET verified.")

    print("\n[9] Multi-User Data Isolation Verification...")
    other_id = uuid.uuid4().hex[:8]
    other_email = f"other_driver_{other_id}@smartev.com"
    other_client = httpx.Client(timeout=30.0)
    other_client.post(f"{BASE_URL}/api/auth/register", json={
        "full_name": "Other Driver",
        "email": other_email,
        "password": test_password,
        "confirm_password": test_password,
        "accept_terms": True,
    })
    r = other_client.post(f"{BASE_URL}/api/auth/login", json={"email": other_email, "password": test_password})
    other_token = r.json()["access_token"]
    other_client.headers.update({"Authorization": f"Bearer {other_token}"})

    # Other user cannot see original user's vehicle
    r = other_client.get(f"{BASE_URL}/api/vehicles/{vehicle_id}")
    assert r.status_code == 404, f"Expected 404 for isolated vehicle, got {r.status_code}"

    # Other user cannot see original user's journey
    r = other_client.get(f"{BASE_URL}/api/journeys/{journey_id}")
    assert r.status_code == 404, f"Expected 404 for isolated journey, got {r.status_code}"
    print("    Multi-user isolation verified: Cross-user access rejected with 404.")

    print("\n[10] Delete Journey & Cleanup...")
    r = client.delete(f"{BASE_URL}/api/journeys/{journey_id}")
    assert r.status_code in [200, 204]
    r = client.get(f"{BASE_URL}/api/journeys/{journey_id}")
    assert r.status_code == 404
    print(f"    Journey {journey_id} successfully deleted.")

    # Cleanup vehicle
    r = client.delete(f"{BASE_URL}/api/vehicles/{vehicle_id}")
    assert r.status_code in [200, 204]
    print(f"    Vehicle {vehicle_id} successfully deleted.")

    print("\n" + "=" * 60)
    print(" ALL TESTS PASSED SUCCESSFULLY! SMART EV MANUAL INPUT IS VERIFIED.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        run_test()
    except AssertionError as e:
        print(f"\n[FAIL] Assertion failed: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Unexpected error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
