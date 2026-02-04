import sqlite3
import json

def verify_fix():
    conn = sqlite3.connect("backend/shortkings.db")
    # No row factory for simple verification
    cursor = conn.cursor()
    
    print("--- CALENDAR DAYS CHECK ---")
    
    # Check Prep (Jan 4, 5)
    print("\nPrep Check:")
    rows = cursor.execute("SELECT date, phase, day_type FROM calendarday WHERE phase='PRE_PROD' ORDER BY date").fetchall()
    for r in rows:
        print(r)
        
    print("\nShoot Check:")
    rows = cursor.execute("SELECT date, phase, day_type FROM calendarday WHERE phase='SHOOT' ORDER BY date").fetchall()
    for r in rows:
        print(r)
        
    print("\nPost Check:")
    rows = cursor.execute("SELECT date, phase, day_type FROM calendarday WHERE phase='POST_PROD' ORDER BY date").fetchall()
    for r in rows:
        print(r)

    conn.close()

if __name__ == "__main__":
    verify_fix()
