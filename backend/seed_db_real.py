from sqlmodel import Session, select, create_engine, delete
from models import Budget, BudgetCategory, BudgetGrouping, LineItem, Project
import json
import os
import uuid

from models import Budget, BudgetCategory, BudgetGrouping, LineItem, Project
from database import engine
import json
import os
import uuid


def seed_real():
    print("Starting REAL seed...")
    with Session(engine) as session:
        # 1. Clean existing data?
        # Let's clean everything to be safe
        print("Cleaning DB...")
        session.exec(delete(LineItem))
        session.exec(delete(BudgetGrouping))
        session.exec(delete(BudgetCategory))
        session.exec(delete(Budget))
        session.exec(delete(Project))
        session.commit()
        
        # 2. Create Project & Budget
        print("Creating Project/Budget...")
        proj = Project(name="ShortKings Demo Project", client="Internal")
        session.add(proj)
        session.commit()
        session.refresh(proj)
        
        budget = Budget(name="v1.0", project_id=proj.id)
        session.add(budget)
        session.commit()
        session.refresh(budget)
        
        # 3. Load JSON
        with open("budget_data.json", "r") as f:
            seed_data = json.load(f)
            
        print(f"Seeding {len(seed_data)} categories...")
        
        # 4. Iterate and Insert
        for i, cat_data in enumerate(seed_data):
            try:
                # Category
                db_cat = BudgetCategory(
                    id=cat_data.get("id", str(uuid.uuid4())),
                    code=cat_data.get("code", "??"),
                    name=cat_data.get("name", "Untitled"),
                    budget_id=budget.id,
                    sort_order=i
                )
                session.add(db_cat)
                session.commit() # Commit to get ID if needed, though we set it explicitly if present
                
                # Groupings
                for grp_data in cat_data.get("groupings", []):
                    db_grp = BudgetGrouping(
                        id=grp_data.get("id", str(uuid.uuid4())),
                        code=grp_data.get("code", ""),
                        name=grp_data.get("name", "General"),
                        category_id=db_cat.id
                    )
                    session.add(db_grp)
                    session.commit()
                    
                    # Items
                    for item_data in grp_data.get("items", []):
                        # Ensure we map allowances correctly
                        allows = item_data.get("allowances", [])
                        allows_json = json.dumps(allows)
                        
                        db_item = LineItem(
                            id=item_data.get("id", str(uuid.uuid4())),
                            description=item_data.get("description", ""),
                            rate=float(item_data.get("rate", 0)),
                            quantity=(float(item_data.get("prep_qty", 0)) + 
                                      float(item_data.get("shoot_qty", 0)) + 
                                      float(item_data.get("post_qty", 0))),
                            unit=item_data.get("unit", "day"),
                            total=float(item_data.get("total", 0)),
                            is_labor=bool(item_data.get("is_labor", False)),
                            prep_qty=float(item_data.get("prep_qty", 0)),
                            shoot_qty=float(item_data.get("shoot_qty", 0)),
                            post_qty=float(item_data.get("post_qty", 0)),

                            base_hourly_rate=float(item_data.get("base_hourly_rate", 0)),

                            days_per_week=float(item_data.get("days_per_week", 5)),
                            allowances_json=allows_json,
                            labor_phases_json=item_data.get("labor_phases_json", "[]"),
                            grouping_id=db_grp.id
                        )
                        session.add(db_item)
                
                print(f"Seeded Category {db_cat.code}")
                session.commit()
                
            except Exception as e:
                print(f"Error seeding category {cat_data.get('code')}: {e}")
                import traceback
                traceback.print_exc()
                
    print("Seed Complete.")

if __name__ == "__main__":
    seed_real()
