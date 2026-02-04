import os
import sys
import uuid
import json
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.database import engine
from backend.models import Project, Budget, BudgetCategory, BudgetGrouping, LineItem
from sqlmodel import Session, select

def replicate():
    with Session(engine) as session:
        # 1. Create Project
        project = Project(
            name="Full Replica - ShortKings",
            client="Mockup Test"
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        print(f"Created Project: {project.id}")

        # 2. Create Budget
        budget = Budget(
            name="v1.0 (Replicated)",
            project_id=project.id
        )
        session.add(budget)
        session.commit()
        session.refresh(budget)

        # 3. Load structure from budget_data.json to ensure groupings exist
        json_path = os.path.join(os.getcwd(), 'backend', 'budget_data.json')
        with open(json_path, 'r') as f:
            structure = json.load(f)

        grouping_map = {} # code -> id

        for cat_data in structure:
            cat = BudgetCategory(
                code=cat_data['code'],
                name=cat_data['name'],
                budget_id=budget.id
            )
            session.add(cat)
            session.commit()
            session.refresh(cat)
            
            for grp_data in cat_data.get('groupings', []):
                grp = BudgetGrouping(
                    code=grp_data['code'],
                    name=grp_data['name'],
                    category_id=cat.id
                )
                session.add(grp)
                session.commit()
                session.refresh(grp)
                grouping_map[grp.code] = grp.id

        # 4. Inject Specific Mockup Items
        items_to_add = [
            # A.1 Story & Script
            {"grp": "A.1", "desc": "Writers Fees", "rate": 900.0, "qty": 1.0, "unit": "allow", "labor": True},
            
            # B.1 Producers
            {"grp": "B.1", "desc": "Producer (Permanent)", "rate": 1068.4, "prep": 0.5, "labor": True, "base": 1068.4},
            
            # B.2 Directors
            {"grp": "B.2", "desc": "Director (Permanent)", "rate": 1198.5, "prep": 0.5, "labor": True, "base": 1198.5},
            {"grp": "B.2", "desc": "Holiday Pay & Fringes", "rate": 97.38, "qty": 1.0, "unit": "allow", "labor": False},
            
            # F.1 Costumes
            {"grp": "F.1", "desc": "Principals - Australian", "rate": 100.0, "prep": 3.0, "unit": "day", "labor": False},
            
            # G.1 Locations
            {"grp": "G.1", "desc": "Main Office location", "rate": 1000.0, "shoot": 1.0, "unit": "day", "labor": False},
            
            # H.2 Props
            {"grp": "H.2", "desc": "Equipment - Hire", "rate": 1500.0, "shoot": 1.0, "unit": "day", "labor": False},
            
            # K.5 Unit Facilities
            {"grp": "K.5", "desc": "Vehicle Allowances", "rate": 50.0, "shoot": 5.0, "unit": "day", "labor": False},
            {"grp": "K.5", "desc": "Main Unit Crew Catering", "rate": 15.0, "shoot": 5.0, "notes": "Headcount assumed 1 for now", "unit": "day", "labor": False},
        ]

        for itm in items_to_add:
            grp_id = grouping_map.get(itm['grp'])
            if not grp_id:
                # Fallback to first grouping in that category letter if code doesn't match perfectly
                # (e.g. A.1 vs A1)
                letter = itm['grp'][0]
                for code, gid in grouping_map.items():
                    if code.startswith(letter):
                        grp_id = gid
                        break

            if grp_id:
                # Simple total calc for script injection
                prep = itm.get('prep', 0)
                shoot = itm.get('shoot', 0)
                post = itm.get('post', 0)
                qty = itm.get('qty', prep + shoot + post)
                rate = itm['rate']
                total = rate * qty
                
                # Special hack: if it's "Producer" in mockup, it includes an OT portion that we'll just add to rate for now
                if "Producer" in itm['desc']:
                    total = 534.2 # Mockup Value for 0.5 prep
                elif "Director" in itm['desc']:
                    total = 599.25 # Mockup Value for 0.5 prep

                line = LineItem(
                    description=itm['desc'],
                    rate=rate,
                    quantity=qty,
                    prep_qty=prep,
                    shoot_qty=shoot,
                    post_qty=post,
                    unit=itm.get('unit', 'day'),
                    total=total,
                    is_labor=itm['labor'],
                    base_hourly_rate=itm.get('base', 0),
                    grouping_id=grp_id,
                    notes=itm.get('notes')
                )
                session.add(line)

        session.commit()
        print("Done! Replicated budget created.")

if __name__ == "__main__":
    replicate()
