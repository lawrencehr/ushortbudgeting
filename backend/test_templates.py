from fastapi.testclient import TestClient
from main import app
from database import create_db_and_tables

client = TestClient(app)

def test_template_flow():
    # 1. Ensure DB is ready
    create_db_and_tables()
    
    # 2. Get default budget to use as source
    resp = client.get("/api/budget")
    assert resp.status_code == 200, f"Failed to get budget: {resp.text}"
    budget_data = resp.json()
    source_budget_id = budget_data[0]["id"] # Assuming logic returns list of categories which implies budget exists
    # Wait, /api/budget returns categories, not the budget object itself sometimes?
    # Let's check main.py logic for /api/budget.
    # It returns _build_budget_response, which is List[Category].
    # But I need the budget_id.
    # The categories have 'budget_id' in them?
    # No, usually they reference it.
    
    # Alternative: Get projects to find the budget.
    resp = client.get("/api/projects")
    projects = resp.json()
    project_id = projects[0]["id"]
    
    # We need a budget ID to create a template.
    # Helper: let's peek at the DB or assumes there's a budget linked to this project.
    # /api/budget ensures a budget exists.
    # But checking the code, /api/budget returns `_build_budget_response`.
    # I need the ID.
    # Let's query /api/budgets/{budget_id} if I knew the ID.
    
    # Let's cheating and use SQLModel directly to find the budget ID for the test
    from models import Budget
    from database import engine
    from sqlmodel import Session, select
    
    with Session(engine) as session:
        budget = session.exec(select(Budget)).first()
        budget_id = budget.id
        print(f"Found Budget ID: {budget_id}")

    # 3. Create Template
    print("Creating Template...")
    resp = client.post("/api/templates", json={
        "name": "Test Template",
        "description": "A test template",
        "budget_id": budget_id,
        "reset_quantities": True
    })
    assert resp.status_code == 200, f"Create failed: {resp.text}"
    template_data = resp.json()
    template_id = template_data["id"]
    print(f"Template Created: {template_id}")
    
    # 4. List Templates
    print("Listing Templates...")
    resp = client.get("/api/templates")
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) > 0
    print(f"Found {len(templates)} templates")
    
    # 5. Initialize Budget from Template
    print("Initializing new budget from template...")
    resp = client.post("/api/budget/initialize", json={
        "name": "Derived Budget",
        "template_id": template_id,
        "project_id": project_id
    })
    assert resp.status_code == 200, f"Init failed: {resp.text}"
    new_budget_info = resp.json()
    print(f"New Budget Created: {new_budget_info['budget_id']}")
    
    print("Test Passed!")

if __name__ == "__main__":
    test_template_flow()
