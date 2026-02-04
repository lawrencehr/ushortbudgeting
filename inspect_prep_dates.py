import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect("backend/shortkings.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("--- PRE_PROD DATES ---")
    days = cursor.execute("SELECT date, phase, day_type, is_holiday FROM calendarday WHERE phase = 'PRE_PROD' ORDER BY date").fetchall()
    for d in days:
        print(dict(d))

    conn.close()

if __name__ == "__main__":
    inspect_db()
