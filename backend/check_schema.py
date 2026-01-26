
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "shortkings.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Columns in lineitem table:")
try:
    cursor.execute("PRAGMA table_info(lineitem)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"{col[1]} ({col[2]})")
except Exception as e:
    print(e)
finally:
    conn.close()
