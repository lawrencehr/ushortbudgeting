from sqlmodel import Session, create_engine, select
import sys
import os

# Ensure we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
# Also add current dir
sys.path.append(os.getcwd())

from backend.models import LineItem, BudgetCategory, BudgetGrouping, Budget
from backend.labor_calculator_service import calculate_labor_cost, LaborCostRequest
import json

# Connect to DB
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
        # Find C.4
        statement = select(LineItem).where(LineItem.description.ilike("%Camera Operator%"))
        items = session.exec(statement).all()
        
        if not items:
            print("C.4 (Camera Operator) not found")
            return
            
        # Get one
        item = items[0]
        print(f"Inspecting Item: {item.description} (ID: {item.id})")
        print(f"Base Hourly: {item.base_hourly_rate}, Is Casual: {item.is_casual}")
        print(f"Grouping ID: {item.grouping_id}\n")
        
        fringe_settings = load_fringe_settings()
        
        # Build Request
        req = LaborCostRequest(
            line_item_id=item.id,
            base_hourly_rate=item.base_hourly_rate or item.rate or 50.0,
            is_casual=item.is_casual or False,
            is_artist=False,
            calendar_mode=item.calendar_mode or "inherit",
            phase_details=item.phase_details,
            grouping_id=item.grouping_id,
            project_id="unknown"
        )
        
        # Need Project ID from budget
        grouping = session.get(BudgetGrouping, item.grouping_id)
        if grouping:
            category = session.get(BudgetCategory, grouping.category_id)
            if category:
                budget = session.get(Budget, category.budget_id)
                if budget:
                    req.project_id = budget.project_id
        
        print(f"Project ID: {req.project_id}")
        
        # Execute Calc
        result = calculate_labor_cost(session, req, fringe_settings)
        
        print("\n--- RESULTS ---")
        print(f"Total Cost: {result.total_cost}")
        print("Breakdown:")
        for phase, data in result.breakdown.items():
            print(f"  {phase}: Days={data['days']}, Cost={data['cost']}")
            for detail in data['details']:
                print(f"    - {detail['date']} ({detail['day_type']}, Holiday: {detail['is_holiday']}): {detail['hours']}h -> ${detail['total_day_cost']} ({detail.get('multiplier', 'N/A')}x)")

if __name__ == "__main__":
    debug_c4_calc()
