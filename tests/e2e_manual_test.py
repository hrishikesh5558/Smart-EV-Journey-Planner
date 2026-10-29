"""
E2E Live Integration Test  Smart EV Manual Input Range Planner (v2)
Tests the complete workflow against real running FastAPI + MongoDB.
No OCR. All inputs are manual.
"""

import sys
import uuid
import httpx

BASE_URL = "http://127.0.0.1:8000"


def run_test():
    client = httpx.Client(timeout=30.0)

    #  1. Health Check 
    print("[1] Health check...")
    r = client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    h = r.json()
    assert h["database"] == "connected"
    assert h.get("input_method") == "manual", f"Expected input_method=manual, got: {h}"
    print(f"    OK: v{h['version']} | database={h['database']} | input_method={h['input_method']}")

    #  2. User Registration 
    uid = uuid.uuid4().hex[:8]
    email = f"e2e_manual_{uid}@smartev.com"
    password = "TestManual@123!"
    print(f"\n[2] Register new user: {email}")
    r = client.post(f"{BASE_URL}/api/auth/register", json={
        "full_name": "E2E Manual Driver",
        "email": email,
        "password": password,
        "confirm_password": password,
        "accept_terms": True,
    })
    assert r.status_code in [200, 201], f"Registration failed: {r.text}"
    print("    Registered successfully.")

    #  3. Login 
    print("\n[3] Login...")
    r = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    print(f"    Token: {token[:20]}...")

    #  4. Add Vehicle 
    print("\n[4] Add vehicle to garage...")
    r = client.post(f"{BASE_URL}/api/vehicles", json={
        "nickname": "My Test EV",
        "manufacturer": "Tesla",
        "model": "Model Y",
        "battery_capacity_kwh": 75.0,
        "registration_identifier": "MH-12-EV-9999",
    })
    assert r.status_code in [200, 201], f"Vehicle create failed: {r.text}"
    vehicle = r.json()
    vehicle_id = vehicle.get("id") or vehicle.get("_id")
    assert vehicle_id
    print(f"    Vehicle created: {vehicle['nickname']} (ID: {vehicle_id})")

    #  5. Stateless Calculate Endpoint 
    print("\n[5] Test /api/journeys/calculate (stateless) ...")

    # Test A: Sufficient (250 km range, 180 km journey, 15% reserve)
    # reserve_dist = 250 * 0.15 = 37.5, usable = 212.5, margin = 32.5
    r = client.post(f"{BASE_URL}/api/journeys/calculate", json={
        "estimated_remaining_range_km": 250.0,
        "planned_journey_distance_km": 180.0,
        "reserve_percentage": 15.0,
    })
    assert r.status_code == 200, f"Calculate A failed: {r.text}"
    res = r.json()
    assert res["is_sufficient"] is True, f"Expected sufficient: {res}"
    assert res["reserve_distance_km"] == 37.5
    assert res["usable_range_km"] == 212.5
    assert res["remaining_margin_km"] == 32.5
    assert "sufficient" in res["recommendation"].lower(), f"Expected sufficient recommendation, got: {res['recommendation']}"

    # Test B: Insufficient (120 km range, 150 km journey, 10% reserve)
    # reserve_dist = 12, usable = 108, margin = -42
    r = client.post(f"{BASE_URL}/api/journeys/calculate", json={
        "estimated_remaining_range_km": 120.0,
        "planned_journey_distance_km": 150.0,
        "reserve_percentage": 10.0,
    })
    assert r.status_code == 200, f"Calculate B failed: {r.text}"
    res = r.json()
    assert res["is_sufficient"] is False
    assert res["usable_range_km"] == 108.0
    assert res["remaining_margin_km"] == -42.0
    assert "Charging before departure" in res["recommendation"]
    print(f"    B (Insufficient): usable={res['usable_range_km']} km | margin={res['remaining_margin_km']} km [OK]")

    # Test C: Zero reserve allowed
    r = client.post(f"{BASE_URL}/api/journeys/calculate", json={
        "estimated_remaining_range_km": 100.0,
        "planned_journey_distance_km": 90.0,
        "reserve_percentage": 0.0,
    })
    assert r.status_code == 200
    res = r.json()
    assert res["reserve_distance_km"] == 0.0
    assert res["usable_range_km"] == 100.0
    print(f"    C (Zero reserve): usable={res['usable_range_km']} km [OK]")

    # Test D: Negative distance should fail
    r = client.post(f"{BASE_URL}/api/journeys/calculate", json={
        "estimated_remaining_range_km": 200.0,
        "planned_journey_distance_km": -10.0,
        "reserve_percentage": 10.0,
    })
    assert r.status_code == 422, f"Expected 422 for negative distance, got {r.status_code}"
    print(f"    D (Negative distance rejected): HTTP {r.status_code} [OK]")

    # Test E: Battery% > 100 should fail on save
    print("\n[5e] Test validation: battery % > 100 rejected on /journeys/save ...")
    r = client.post(f"{BASE_URL}/api/journeys/save", json={
        "current_battery_percentage": 105.0,
        "estimated_remaining_range_km": 250.0,
        "journey_distance_km": 180.0,
        "reserve_percentage": 15.0,
    })
    assert r.status_code == 422, f"Expected 422 for battery>100, got {r.status_code}"
    print(f"    Battery>100 rejected: HTTP {r.status_code} [OK]")

    #  6. Save Journey to MongoDB 
    print("\n[6] Save journey to MongoDB (/api/journeys/save) ...")
    save_payload = {
        "vehicle_id": vehicle_id,
        "manufacturer": "Tesla",
        "model": "Model Y",
        "battery_capacity_kwh": 75.0,
        "current_battery_percentage": 80.0,
        "estimated_remaining_range_km": 250.0,
        "starting_location": "Mumbai",
        "destination": "Pune",
        "journey_distance_km": 180.0,
        "reserve_percentage": 15.0,
        "notes": "Weekend trip test",
        "driving_conditions": "highway",
    }
    r = client.post(f"{BASE_URL}/api/journeys/save", json=save_payload)
    assert r.status_code in [200, 201], f"Save journey failed: {r.text}"
    saved = r.json()
    j = saved.get("journey") or saved
    journey_id = j.get("id") or j.get("_id")
    assert journey_id, f"No journey ID: {saved}"

    # Verify stored fields
    assert j.get("manufacturer") == "Tesla"
    assert j.get("model") == "Model Y"
    assert j.get("current_battery_percentage") == 80.0
    assert j.get("estimated_remaining_range_km") == 250.0
    assert j.get("journey_distance_km") == 180.0
    assert j.get("reserve_percentage") == 15.0
    assert j.get("reserve_distance_km") == 37.5
    assert j.get("usable_range_km") == 212.5
    assert j.get("remaining_margin_km") == 32.5
    assert j.get("result_status") == "feasible"
    assert j.get("destination") in ["Pune", None] or j.get("destination_name") == "Pune"
    print(f"    Journey saved: ID={journey_id} | status={j['result_status']} | margin={j['remaining_margin_km']} km")

    #  7. Journey History 
    print("\n[7] Verify journey appears in history...")
    r = client.get(f"{BASE_URL}/api/journeys/history")
    assert r.status_code == 200, f"History failed: {r.text}"
    journeys = r.json()
    assert len(journeys) >= 1
    ids = [jj.get("id") or jj.get("_id") for jj in journeys]
    assert journey_id in ids, f"Saved journey not in history. IDs: {ids}"
    print(f"    Found {len(journeys)} journey(s) in history [OK]")

    #  8. Get Single Journey 
    print("\n[8] Get single journey record...")
    r = client.get(f"{BASE_URL}/api/journeys/{journey_id}")
    assert r.status_code == 200, f"Get journey failed: {r.text}"
    got = r.json()
    assert got.get("id") == journey_id or got.get("_id") == journey_id
    print(f"    Single record: {got.get('destination') or got.get('destination_name')} [OK]")

    #  9. Dashboard Stats Summary 
    print("\n[9] Dashboard stats summary...")
    r = client.get(f"{BASE_URL}/api/journeys/stats/summary")
    assert r.status_code == 200, f"Stats failed: {r.text}"
    stats = r.json()
    assert stats["total_vehicles"] >= 1
    assert stats["total_journeys"] >= 1
    assert stats["feasible_journeys"] >= 1
    print(f"    Vehicles: {stats['total_vehicles']} | Journeys: {stats['total_journeys']} | Feasible: {stats['feasible_journeys']} [OK]")

    #  10. Save a second journey (charging_recommended) 
    print("\n[10] Save insufficient journey...")
    r = client.post(f"{BASE_URL}/api/journeys/save", json={
        "current_battery_percentage": 30.0,
        "estimated_remaining_range_km": 80.0,
        "destination": "Nashik",
        "journey_distance_km": 180.0,
        "reserve_percentage": 15.0,
    })
    assert r.status_code in [200, 201], f"Save 2 failed: {r.text}"
    j2 = r.json().get("journey") or r.json()
    j2_id = j2.get("id") or j2.get("_id")
    assert j2.get("result_status") == "charging_recommended"
    print(f"    Insufficient journey saved: ID={j2_id} | status={j2['result_status']} [OK]")

    #  11. User Isolation 
    print("\n[11] Multi-user isolation check...")
    other_email = f"other_{uid}@smartev.com"
    other_client = httpx.Client(timeout=10.0)
    other_client.post(f"{BASE_URL}/api/auth/register", json={
        "full_name": "Other User",
        "email": other_email,
        "password": "OtherPass@123!",
        "confirm_password": "OtherPass@123!",
        "accept_terms": True,
    })
    login_r = other_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": other_email, "password": "OtherPass@123!"
    })
    assert login_r.status_code == 200
    other_token = login_r.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other user cannot access journey
    r = other_client.get(f"{BASE_URL}/api/journeys/{journey_id}", headers=other_headers)
    assert r.status_code in [403, 404], f"Expected 403/404 for isolation, got {r.status_code}"
    print(f"    Cross-user journey access blocked: HTTP {r.status_code} [OK]")

    # Other user cannot delete journey
    r = other_client.delete(f"{BASE_URL}/api/journeys/{journey_id}", headers=other_headers)
    assert r.status_code in [403, 404], f"Expected 403/404 for isolation, got {r.status_code}"
    print(f"    Cross-user journey delete blocked: HTTP {r.status_code} [OK]")

    #  12. Delete Journey 
    print("\n[12] Delete own journey...")
    r = client.delete(f"{BASE_URL}/api/journeys/{j2_id}")
    assert r.status_code in [200, 204], f"Delete failed: {r.text}"
    print(f"    Journey {j2_id} deleted: HTTP {r.status_code} [OK]")

    # Verify deleted
    r = client.get(f"{BASE_URL}/api/journeys/{j2_id}")
    assert r.status_code == 404
    print("    Confirmed deleted (404) [OK]")

    #  13. Reserved: profile update 
    print("\n[13] Profile update...")
    r = client.put(f"{BASE_URL}/api/auth/profile", json={
        "full_name": "E2E Driver Updated",
        "default_safety_reserve": 20,
        "preferred_unit": "km",
    })
    assert r.status_code == 200, f"Profile update failed: {r.text}"
    assert r.json()["full_name"] == "E2E Driver Updated"
    print("    Profile updated [OK]")

    #  14. Cleanup vehicle 
    print("\n[14] Cleanup test vehicle...")
    r = client.delete(f"{BASE_URL}/api/vehicles/{vehicle_id}")
    assert r.status_code in [200, 204]
    print(f"    Vehicle deleted: HTTP {r.status_code} [OK]")

    print("\n" + "=" * 60)
    print(" ALL 14 WORKFLOW STEPS PASSED  MANUAL INPUT CONFIRMED")
    print("=" * 60)
    print("\nWorkflow verified:")
    print("  Register  Login  Add Vehicle  Calculate Range ")
    print("  Save to MongoDB  View History  User Isolation ")
    print("  Delete Journey  Profile Update  Cleanup")


if __name__ == "__main__":
    try:
        run_test()
    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] UNEXPECTED ERROR: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
