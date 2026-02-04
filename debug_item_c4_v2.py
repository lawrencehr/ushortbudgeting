import sqlite3
import os
import json

# Ensure we can import from backend
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
sys.path.append(os.getcwd())

from backend.labor_calculator_service import calculate_labor_cost, LaborCostRequest
from backend.models import LineItem, BudgetGrouping, BudgetCategory, Budget
# DON'T import models unless necessary to init DB, using raw sql IS safer for debug
# Actually, calculate_labor_cost REQUIRES session.
# We must use sqlmodel.Session

from sqlmodel import Session, create_engine, select

DB_URL = "sqlite:///backend/shortkings.db"
# Use extend_existing=True hack if possible? 
# Or just accept that models are imported once.
# The error `Table 'projectphase' is already defined` happens because `backend.models` runs on import
# and defines metadata, then `debug_item_c4` likely re-imports it or SQLModel registry issues.

# Fix: rely on backend imports only? 
# Or try to clear metadata? No.

engine = create_engine(DB_URL)

def load_fringe_settings():
    path = os.path.join("backend", "fringe_settings.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            data = json.load(f)
            from pydantic import BaseModel
            class FringeSettings(BaseModel):
                superannuation: float = 11.0
                holiday_pay: float = 4.0
                payroll_tax: float = 5.45
                workers_comp: float = 1.0
                contingency: float = 0.0
            return FringeSettings(**data)
    return None

def debug_c4_calc():
    with Session(engine) as session:
        # Find C.4
        # RAW SQL to get ID first?
        # Use SQLModel select
        statement = select(LineItem).where(LineItem.description.ilike("%Camera Operator%"))
        items = session.exec(statement).all()
        
        if not items:
            print("C.4 (Camera Operator) not found")
            return
            
        item = items[0]
        print(f"Inspecting Item: {item.description} (ID: {item.id})")
        
        fringe_settings = load_fringe_settings()
        
        # Build Request
        # Need Project ID
        # Assume linked budget has project
        grouping = session.get(BudgetGrouping, item.grouping_id)
        if not grouping: 
             print("Orphan item")
             return
        category = session.get(BudgetCategory, grouping.category_id)
        budget = session.get(Budget, category.budget_id)
        project_id = budget.project_id
        
        req = LaborCostRequest(
            line_item_id=item.id,
            base_hourly_rate=item.base_hourly_rate or item.rate or 50.0,
            is_casual=item.is_casual or False,
            is_artist=False,
            calendar_mode=item.calendar_mode or "inherit",
            phase_details=item.phase_details,
            grouping_id=item.grouping_id,
            project_id=project_id 
        )
        
        print(f"Project ID: {project_id}")
        
        # Execute Calc
        result = calculate_labor_cost(session, req, fringe_settings)
        
        print("\n--- RESULTS ---")
        print(f"Total Gross: {result.total_cost}")
        print(f"Total Fringes: {result.fringes['total_fringes']}")
        grand_total = result.total_cost + result.fringes['total_fringes']
        print(f"GRAND TOTAL: {grand_total}")
        
        print("\nBreakdown:")
        for phase, data in result.breakdown.items():
            print(f"  {phase}: Days={data['days']}, Cost={data['cost']}")
            for detail in data['details']:
                print(f"    - {detail['date']} ({detail['day_type']}, Holiday: {detail['is_holiday']}): {detail['hours']}h -> ${detail['total_day_cost']}")

if __name__ == "__main__":
    debug_c4_calc()
