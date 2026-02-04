import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "shortkings.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found, skipping migration.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE lineitem ADD COLUMN breakdown_json VARCHAR")
        print("Added breakdown_json column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("breakdown_json already exists")
        else:
            print(f"Error: {e}")

    try:
        cursor.execute("ALTER TABLE lineitem ADD COLUMN fringes_json VARCHAR")
        print("Added fringes_json column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("fringes_json already exists")
        else:
            print(f"Error: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
