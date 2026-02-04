
import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_schedule_calculation():
    # 1. Setup a specific calendar scenario
    # Saturday (weekend) vs Monday (weekday)
    
    # Get Project
    res = client.get("/api/projects")
    project_id = res.json()[0]["id"]
    
    # Calendar: 
    # May 9, 2026 is a Saturday
    # May 11, 2026 is a Monday
    payload = {
        "phases": {
            "shoot": {
                "defaultHours": 10,
                "dates": ["2026-05-09", "2026-05-11"] # Sat, Mon
            }
        }
    }
    client.post(f"/api/projects/{project_id}/calendar", json=payload)
    
    # 2. Call Calculate Schedule
    # Use a known role "Gaffer" -> usually has pay rates in payguide
    # Or just "Technician A" which was in pay_rates_v2.json
    
    calc_payload = {
        "classification": "Technician A",
        "assignedDays": ["2026-05-09", "2026-05-11"],
        "projectId": project_id
    }
    
    res = client.post("/api/calculate-schedule-cost", json=calc_payload)
    assert res.status_code == 200
    data = res.json()
    
    # 3. Verify Breakdown
    breakdown = data["breakdown"]
    
    print("Calculation Result:", data)
    
    # Should have 1 weekday and 1 weekend day
    assert breakdown["weekday"]["days"] == 1
    assert breakdown["weekend"]["days"] == 1
    
    # Cost Check: Weekend should be higher per day than weekday
    # Weekday Cost / 1 vs Weekend Cost / 1
    weekday_cost = breakdown["weekday"]["cost"]
    weekend_cost = breakdown["weekend"]["cost"]
    
    assert weekend_cost > weekday_cost
    
    print("Schedule Calculation Verification Passed!")

if __name__ == "__main__":
    test_schedule_calculation()
