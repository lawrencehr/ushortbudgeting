from datetime import date
import sys
import os

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from models import Project, ProductionCalendar, CalendarDay
from database import engine

def reset_calendar():
    with Session(engine) as session:
        project = session.exec(select(Project)).first()
        if not project:
            print("No project found.")
            return

        print(f"Resetting Calendar for Project: {project.name} ({project.id})")

        # 1. Clear existing
        existing_cals = session.exec(select(ProductionCalendar).where(ProductionCalendar.project_id == project.id)).all()
        for cal in existing_cals:
            session.delete(cal)
        session.commit()

        # 2. Define Phases
        phases = [
            {
                "name": "PRE_PROD", 
                "default_hours": 12.0,
                "dates": [date(2026, 1, 4), date(2026, 1, 5)] # Sun, Mon
            },
            {
                "name": "SHOOT",
                "default_hours": 10.0,
                "dates": [date(2026, 1, 13), date(2026, 1, 14), date(2026, 1, 15), date(2026, 1, 16)] # Tue-Fri
            },
            {
                "name": "POST_PROD",
                "default_hours": 5.0,
                "dates": [date(2026, 1, 23), date(2026, 1, 24), date(2026, 1, 25), date(2026, 1, 26)] # Fri, Sat, Sun, Mon(PH)
            }
        ]

        for p_data in phases:
            cal = ProductionCalendar(
                project_id=project.id,
                phase=p_data["name"],
                default_hours=p_data["default_hours"]
            )
            session.add(cal)
            session.flush()

            for d_date in p_data["dates"]:
                # Determine type
                wd = d_date.weekday()
                day_type = 'WEEKDAY'
                if wd == 5: day_type = 'WEEKEND' # Sat (Logic usually handles specific SAT/SUN in calc, but DB stores WEEKEND/HOLIDAY)
                if wd == 6: day_type = 'WEEKEND' # Sun

                # Holiday Check (Manual for Scenario)
                is_holiday = False
                hol_name = None
                if d_date == date(2026, 1, 26):
                    is_holiday = True
                    hol_name = "Australia Day"
                    day_type = 'HOLIDAY'

                c_day = CalendarDay(
                    calendar_id=cal.id,
                    date=d_date,
                    phase=p_data["name"],
                    day_type=day_type,
                    is_holiday=is_holiday,
                    holiday_name=hol_name
                )
                session.add(c_day)
        
        session.commit()
        print("Calendar Reset Complete.")

if __name__ == "__main__":
    reset_calendar()
