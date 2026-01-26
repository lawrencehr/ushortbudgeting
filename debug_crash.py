import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from rate_lookup_service import get_rate_service

print("Attempting to calculate cost for 'Technician A (Casual)'...")

try:
    service = get_rate_service()
    result = service.calculate_day_cost("Technician A (Casual)", 12.0, "WEEKDAY")
    print("Success!")
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"\nCRASH DETECTED: {e}")
    import traceback
    traceback.print_exc()
