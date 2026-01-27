from sqlmodel import Session, select, create_engine
from models import Budget, BudgetCategory, BudgetGrouping, LineItem, Project
import json
import os
import uuid

# Setup DB connection (same as database.py)
sqlite_file_name = "shortkings.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

def seed_db():
    print("Starting manual seed...")
    with Session(engine) as session:
        # Check validation by trying to validate a single item from JSON
        with open("budget_data.json", "r") as f:
            data = json.load(f)
            
        print("JSON loaded. Categories: ", len(data))
        
        # Create Dummy Project/Budget if needed
        budget = session.exec(select(Budget)).first()
        if not budget:
             print("Creating dummy budget...")
             proj = Project(name="Debug Project")
             session.add(proj)
             session.commit()
             session.refresh(proj)
             budget = Budget(name="Debug Budget", project_id=proj.id)
             session.add(budget)
             session.commit()
             session.refresh(budget)
             print(f"Created budget {budget.id}")

        # Try to parse one item to LineItem model
        try:
             first_cat = data[0]
             first_grp = first_cat['groupings'][0]
             first_item = first_grp['items'][0]
             
             print("Testing item:")
             print(json.dumps(first_item, indent=2))
             
             # Mimic main.py logic
             db_item = LineItem(
                 id=first_item.get("id"),
                 description=first_item.get("description", ""),
                 rate=float(first_item.get("rate", 0)),
                 quantity=(float(first_item.get("prep_qty", 0)) + 
                           float(first_item.get("shoot_qty", 0)) + 
                           float(first_item.get("post_qty", 0))),
                 unit=first_item.get("unit", "day"),
                 total=float(first_item.get("total", 0)),
                 is_labor=bool(first_item.get("is_labor", False)),
                 prep_qty=float(first_item.get("prep_qty", 0)),
                 shoot_qty=float(first_item.get("shoot_qty", 0)),
                 post_qty=float(first_item.get("post_qty", 0)),
                 base_rate=float(first_item.get("base_hourly_rate", 0)),
                 days_per_week=float(first_item.get("days_per_week", 5)),
                 allowances_json=json.dumps(first_item.get("allowances", [])),
                 labor_phases_json=first_item.get("labor_phases_json", "[]"),
                 grouping_id="dummy_grp_id"
             )
             print("Item valid!", db_item)
             
        except Exception as e:
             print(f"Validation Error on dummy item: {e}")
             import traceback
             traceback.print_exc()

if __name__ == "__main__":
    seed_db()
