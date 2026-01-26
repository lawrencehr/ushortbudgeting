from fastapi.testclient import TestClient
from main import app
import json
import os

client = TestClient(app)

def test_settings_endpoints():
    print("--- Testing Settings Endpoints ---")
    
    # 1. GET settings (should return defaults or existing file)
    response = client.get("/api/settings")
    assert response.status_code == 200
    settings = response.json()
    print(f"GET /api/settings: {settings}")
    assert "superannuation" in settings
    
    # 2. POST settings
    new_settings = {
        "superannuation": 12.5,
        "holiday_pay": 5.0,
        "payroll_tax": 4.5,
        "workers_comp": 2.0,
        "contingency": 15.0
    }
    response = client.post("/api/settings", json=new_settings)
    assert response.status_code == 200
    updated_settings = response.json()
    print(f"POST /api/settings: {updated_settings}")
    assert updated_settings["superannuation"] == 12.5
    
    # 3. GET settings again to verify persistence
    response = client.get("/api/settings")
    assert response.status_code == 200
    final_settings = response.json()
    print(f"GET /api/settings (after update): {final_settings}")
    assert final_settings["superannuation"] == 12.5
    
    print("--- Settings Endpoints Verified ---")

if __name__ == "__main__":
    try:
        test_settings_endpoints()
    except Exception as e:
        print(f"Verification Failed: {e}")
        import traceback
        traceback.print_exc()
