from sqlmodel import Session, create_engine, select
import json
import os
from models import LineItem, BudgetGrouping, ProductionCalendar, CalendarDay

DB_URL = "sqlite:///backend/shortkings.db"
engine = create_engine(DB_URL)

def inspect_db():
    with Session(engine) as session:
        print("--- Budget Grouping Overrides ---")
        groupings = session.exec(select(BudgetGrouping)).all()
        for g in groupings:
            if g.calendar_overrides and g.calendar_overrides != {}:
                print(f"Grouping: {g.name} ({g.id}) Overrides: {json.dumps(g.calendar_overrides)}")
        
        print("\n--- Line Item Overrides ---")
        items = session.exec(select(LineItem)).all()
        for i in items:
            if i.calendar_mode == "custom" or (i.phase_details and i.phase_details != {}):
                print(f"Item: {i.description} ({i.id}) Mode: {i.calendar_mode}")
                print(f"  Phase Details: {json.dumps(i.phase_details)}")
                print(f"  Total: {i.total}")
                print(f"  Breakdown: {i.breakdown_json}")

if __name__ == "__main__":
    inspect_db()
