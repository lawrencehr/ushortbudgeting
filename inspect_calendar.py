import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect("backend/shortkings.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("--- PRODUCTION CALENDARS ---")
    cals = cursor.execute("SELECT * FROM productioncalendar").fetchall()
    for c in cals:
        print(dict(c))
        
    print("\n--- CALENDAR DAYS ---")
    days = cursor.execute("SELECT * FROM calendarday ORDER BY date").fetchall()
    for d in days:
        print(dict(d))

    conn.close()

if __name__ == "__main__":
    inspect_db()
