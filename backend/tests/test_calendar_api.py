
import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, get_session
from sqlmodel import Session, SQLModel, create_engine
from database import engine as real_engine

client = TestClient(app)

# Use a separate test database or just be careful? 
# For this verify task, I'll assume we can use the dev DB but creating a new project prevents messing up user data.
# Ideally we mock the DB, but "Integration Testing" against the running app is requested.

def test_calendar_flow():
    # 1. Get Projects (to ensure DB is ready)
    res = client.get("/api/projects")
    assert res.status_code == 200
    projects = res.json()
    
    project_id = ""
    if len(projects) > 0:
        project_id = projects[0]["id"]
    else:
        # Create a temp project? endpoint usually auto-creates default
        assert False, "No projects found"

    print(f"Using Project ID: {project_id}")

    # 2. Set Calendar
    # Use dates far in the future to avoid conflicts? Or just standard dates.
    payload = {
        "phases": {
            "preProd": {
                "defaultHours": 8,
                "dates": ["2026-05-01", "2026-05-02"]
            },
            "shoot": {
                "defaultHours": 10,
                "dates": ["2026-05-10", "2026-05-11"]
            },
            "postProd": {
                "defaultHours": 8,
                "dates": ["2026-06-01"]
            }
        }
    }
    
    res = client.post(f"/api/projects/{project_id}/calendar", json=payload)
    if res.status_code != 200:
        print(res.json())
    assert res.status_code == 200

    # 3. Retrieve Calendar
    res = client.get(f"/api/projects/{project_id}/calendar")
    assert res.status_code == 200
    data = res.json()
    
    # Assertions
    assert "phases" in data
    assert "shoot" in data["phases"]
    assert data["phases"]["shoot"]["defaultHours"] == 10.0
    found_date = any("2026-05-10" in d for d in data["phases"]["shoot"]["dates"])
    assert found_date, f"Date 2026-05-10 not found in {data['phases']['shoot']['dates']}"
    
    print("Calendar API Verification Passed!")

if __name__ == "__main__":
    test_calendar_flow()
