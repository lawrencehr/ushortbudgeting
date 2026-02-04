from holiday_service import get_holiday_service
from datetime import date

service = get_holiday_service()
holidays = service.get_all_holidays(force_refresh=True)
print(f"Total holidays: {len(holidays)}")
for h in holidays:
    if "2026-01-26" in h["date"]:
        print(f"Found: {h}")
