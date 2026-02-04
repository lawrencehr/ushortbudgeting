import sqlite3
import uuid
from datetime import datetime

def fix_calendar():
    db_path = "backend/shortkings.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Connected to {db_path}")
    
    # 1. Get Project ID (Assuming single active project for MVP)
    cursor.execute("SELECT id FROM project LIMIT 1")
    project_row = cursor.fetchone()
    if not project_row:
        print("No project found!")
        return
    project_id = project_row[0]
    print(f"Project ID: {project_id}")

    # 2. Get Calendar IDs for Phases
    # We need PRE_PROD and SHOOT
    phases_to_fix = {
        'PRE_PROD': ['2026-01-04', '2026-01-05'],
        'SHOOT':    ['2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16']
    }
    
    for phase_name, new_dates in phases_to_fix.items():
        print(f"\nProcessing {phase_name}...")
        
        # Find Calendar ID
        cursor.execute("SELECT id, default_hours FROM productioncalendar WHERE project_id = ? AND phase = ?", (project_id, phase_name))
        cal_row = cursor.fetchone()
        
        if not cal_row:
            print(f"  Calendar for {phase_name} not found, creating...")
            # Create if missing (unlikely but safe)
            cal_id = str(uuid.uuid4())
            default_hours = 8.0 if phase_name == 'PRE_PROD' else 10.0
            cursor.execute("INSERT INTO productioncalendar (id, project_id, phase, default_hours) VALUES (?, ?, ?, ?)", 
                           (cal_id, project_id, phase_name, default_hours))
        else:
            cal_id = cal_row[0]
            print(f"  Calendar ID: {cal_id}")

        # Delete existing days
        cursor.execute("DELETE FROM calendarday WHERE calendar_id = ?", (cal_id,))
        print(f"  Deleted existing days.")

        # Insert new days
        for date_str in new_dates:
            d_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            weekday = d_obj.weekday() # 0=Mon, 5=Sat, 6=Sun
            
            day_type = 'WEEKDAY'
            if weekday == 5: day_type = 'WEEKEND' # Sat (treated as weekend for type, specific logic in calc handles Sat vs Sun)
            elif weekday == 6: day_type = 'WEEKEND' # Sun
            
            # Simple holiday check (Jan 1, Jan 26 are the main ones in Jan)
            is_holiday = False
            holiday_name = None
            if date_str == '2026-01-26':
                is_holiday = True
                holiday_name = 'Australia Day'
            elif date_str == '2026-01-01':
                is_holiday = True
                holiday_name = "New Year's Day"
                
            new_id = str(uuid.uuid4())
            
            # Note: storing full datetime string for consistency with existing data seen in inspection
            # e.g. '2026-01-04 00:00:00.000000'
            date_iso = f"{date_str} 00:00:00.000000"
            
            cursor.execute("""
                INSERT INTO calendarday (id, calendar_id, date, phase, day_type, is_holiday, holiday_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (new_id, cal_id, date_iso, phase_name, day_type, int(is_holiday), holiday_name))
            
        print(f"  Inserted {len(new_dates)} days.")

    conn.commit()
    conn.close()
    print("\nDatabase update complete.")

if __name__ == "__main__":
    fix_calendar()
