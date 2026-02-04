from sqlmodel import create_engine, text
import os

# Inspect the backend/shortkings.db
sqlite_file_name = "backend/shortkings.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def inspect_db():
    print("Inspecting Database Schema...")
    with engine.connect() as connection:
        # Check LineItem columns
        print("\n[LineItem Columns]")
        result = connection.execute(text("PRAGMA table_info(lineitem)"))
        columns = [row[1] for row in result]
        expected = ["calendar_mode", "phase_details", "award_classification_id", "role_history_id"]
        for exp in expected:
            status = "✅ Found" if exp in columns else "❌ MISSING"
            print(f"  - {exp}: {status}")

        # Check BudgetGrouping columns
        print("\n[BudgetGrouping Columns]")
        result = connection.execute(text("PRAGMA table_info(budgetgrouping)"))
        columns = [row[1] for row in result]
        if "calendar_overrides" in columns:
            print("  - calendar_overrides: ✅ Found")
        else:
            print("  - calendar_overrides: ❌ MISSING")

        # Check RoleHistory table
        print("\n[RoleHistory Table]")
        result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='rolehistory'"))
        if result.first():
            print("  - Table 'rolehistory': ✅ Found")
        else:
            print("  - Table 'rolehistory': ❌ MISSING")

if __name__ == "__main__":
    inspect_db()
