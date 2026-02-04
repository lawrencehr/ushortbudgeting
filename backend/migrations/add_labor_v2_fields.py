from sqlmodel import SQLModel, create_engine, text
from backend.models import RoleHistory
import os

# Database connection
# Fixing path to point to backend/shortkings.db
sqlite_file_name = "backend/shortkings.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

def run_migrations():
    print("Starting Labor Entry V2 Migration...")
    
    # Create engine strictly for migration
    engine = create_engine(sqlite_url)
    
    with engine.connect() as connection:
        # 1. Update BudgetGrouping
        try:
            print("Adding calendar_overrides to BudgetGrouping...")
            connection.execute(text("ALTER TABLE budgetgrouping ADD COLUMN calendar_overrides JSON"))
        except Exception as e:
            print(f"Skipping BudgetGrouping update (might exist): {e}")

        # 2. Update LineItem
        new_columns = [
            ("calendar_mode", "VARCHAR DEFAULT 'inherit'"),
            ("phase_details", "JSON"),
            ("award_classification_id", "VARCHAR"),
            ("role_history_id", "VARCHAR")
        ]
        
        for col, dtype in new_columns:
            try:
                print(f"Adding {col} to LineItem...")
                connection.execute(text(f"ALTER TABLE lineitem ADD COLUMN {col} {dtype}"))
            except Exception as e:
                print(f"Skipping LineItem column {col}: {e}")

        # 3. Create RoleHistory table
        # Since SQLModel doesn't have a simple 'create_table_if_not_exists' for a specific class 
        # without create_all(), we use raw SQL to be safe and explicit for this migration.
        try:
            print("Creating RoleHistory table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS rolehistory (
                    id VARCHAR PRIMARY KEY,
                    role_name VARCHAR NOT NULL,
                    base_rate FLOAT NOT NULL,
                    unit VARCHAR NOT NULL,
                    project_id VARCHAR NOT NULL,
                    project_name VARCHAR,
                    last_used_at DATETIME NOT NULL,
                    usage_count INTEGER DEFAULT 1
                )
            """))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_rolehistory_role_name ON rolehistory (role_name)"))
        except Exception as e:
            print(f"Error creating RoleHistory: {e}")
            
        connection.commit()
    
    print("Migration completed successfully! 🚀")

if __name__ == "__main__":
    run_migrations()
