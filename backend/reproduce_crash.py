
import sys
import os
from sqlmodel import select, Session

# Add current directory to path
sys.path.append(os.getcwd())

from database import engine
from models import Budget, LineItem, BudgetGrouping, BudgetCategory, Project

def test_summary():
    with Session(engine) as session:
        print("Getting budget...")
        budget = session.exec(select(Budget)).first()
        if not budget:
            print("No budget found.")
            return

        print(f"Budget ID: {budget.id}")
        
        print("Executing query...")
        try:
            # Replicating the query in _calculate_budget_summary
            items = session.exec(
                select(LineItem)
                .join(BudgetGrouping)
                .join(BudgetCategory)
                .where(BudgetCategory.budget_id == budget.id)
            ).all()
            print(f"Query successful. Found {len(items)} items.")
            
            total = sum(i.total for i in items)
            print(f"Total: {total}")
            
        except Exception as e:
            print("Query FAILED:")
            print(e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_summary()
