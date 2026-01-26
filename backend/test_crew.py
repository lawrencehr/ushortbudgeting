
from fastapi.testclient import TestClient
from sqlmodel import SQLModel
from main import app
from database import engine
from models import CrewMember, LaborAllowance

client = TestClient(app)

def test_crew_endpoints():
    # Force table creation (drop first to ensure schema update)
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    print("Tables created.")
    print("Testing Crew Endpoints...")
    
    # 1. Create
    response = client.post("/api/crew/", json={
        "name": "Test Crew",
        "role": "Gaffer",
        "base_rate": 500.0,
        "default_days_per_week": 5.0
    })
    if response.status_code != 200:
        print(f"Create failed: {response.text}")
        return
    data = response.json()
    crew_id = data["id"]
    print(f"Created Crew: {data}")
    
    # 2. Get All
    response = client.get("/api/crew/")
    assert response.status_code == 200
    print(f"Get All: Found {len(response.json())} items")
    
    # 3. Get One
    response = client.get(f"/api/crew/{crew_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Crew"
    print("Get One: Success")
    
    # 4. Update
    response = client.patch(f"/api/crew/{crew_id}", json={"role": "Best Boy"})
    assert response.status_code == 200
    assert response.json()["role"] == "Best Boy"
    print("Update: Success")
    
    # 5. Delete
    response = client.delete(f"/api/crew/{crew_id}")
    assert response.status_code == 200
    print("Delete: Success")
    
    # Verify Delete
    response = client.get(f"/api/crew/{crew_id}")
    assert response.status_code == 404
    print("Verify Delete: Success")

if __name__ == "__main__":
    test_crew_endpoints()
