from sqlmodel import Session, select, create_engine
from backend.models import LineItem
import json

# Adjust DB URL if needed (default sqlite)
sqlite_file_name = "backend/shortkings.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def inspect_items():
    with Session(engine) as session:
        items = session.exec(select(LineItem)).all()
        print(f"Found {len(items)} items.")
        for item in items:
            if not item.is_labor:
                print(f"--- Item: {item.description} (ID: {item.id}) ---")
                print(f"Unit: {item.unit}, Total: {item.total}")
                print(f"Breakdown JSON: {item.breakdown_json}")
                if item.breakdown_json:
                    try:
                        bd = json.loads(item.breakdown_json)
                        print(f"Parsed Breakdown Keys: {list(bd.keys())}")
                    except:
                        print("Invalid JSON")
                print("------------------------------------------------")

if __name__ == "__main__":
    inspect_items()
