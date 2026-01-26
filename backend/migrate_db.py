
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "shortkings.db")
print(f"Migrating database at: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding notes column...")
    cursor.execute("ALTER TABLE lineitem ADD COLUMN notes TEXT")
    print("Success.")
except Exception as e:
    print(f"Error adding notes: {e}")

try:
    print("Adding labor_phases_json column...")
    cursor.execute("ALTER TABLE lineitem ADD COLUMN labor_phases_json TEXT DEFAULT '[]'")
    print("Success.")
except Exception as e:
    print(f"Error adding labor_phases_json: {e}")

conn.commit()
conn.close()
