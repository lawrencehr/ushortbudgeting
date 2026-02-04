import sqlite3
import os
import json
import sys

# Add project root needed for backend imports
sys.path.append(os.getcwd())

# Manually construct request dict and call `calculate_labor_cost` logic
# without importing SQLModel if possible? No, service depends on it.

# Try to clear SQLModel metadata before import?
from sqlalchemy import MetaData
# This doesn't help if the class definition execution is what registers it.

# WORKAROUND:
# Instead of initializing the full `backend.main` or executing models, 
# I will use a minimal script that imports only what is needed and avoids double-init.
# The error happens because `backend.models` might be imported twice under different names
# e.g. `models` vs `backend.models`.

from backend.labor_calculator_service import calculate_labor_cost, LaborCostRequest
from backend.models import LineItem, BudgetGrouping, BudgetCategory, Budget, ProductionCalendar, CalendarDay
from sqlmodel import Session, create_engine, select

DB_URL = "sqlite:///backend/shortkings.db"
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
        # 1. Find C.4
        statement = select(LineItem).where(LineItem.description.like("%Camera Operator%"))
        items = session.exec(statement).all()
        
        if not items:
            print("C.4 (Camera Operator) not found")
            return
            
        item = items[0]
        print(f"Inspecting Item: {item.description} (ID: {item.id})")
        
        # 2. Get Dates from DB manually to verify Service sees them
        print("\n--- DB CALENDAR CHECK (via SQLModel) ---")
        cals = session.exec(select(ProductionCalendar)).all()
        for c in cals:
            days = session.exec(select(CalendarDay).where(CalendarDay.calendar_id == c.id)).all()
            print(f"Phase {c.phase}: {len(days)} days found.")
            # Print first few
            for d in days[:2]:
                print(f"  - {d.date} ({d.day_type})")

        fringe_settings = load_fringe_settings()
        
        # 3. Build Request
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
        
        print(f"\nProject ID: {project_id}")
        
        # 4. Execute Service Calc
        result = calculate_labor_cost(session, req, fringe_settings)
        
        print("\n--- CALCULATED RESULTS ---")
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
