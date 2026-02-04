import requests
import json
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8000/api"

def generate_dates(start_str, count):
    # simple Mon-Fri generator
    d = date.fromisoformat(start_str)
    dates = []
    while len(dates) < count:
        if d.weekday() < 5:
            dates.append(d.isoformat())
        d += timedelta(days=1)
    return dates

def verify():
    print("--- Verifying Labor Calculation API ---")
    
    # 1. Get Project
    try:
        res = requests.get(f"{BASE_URL}/projects", timeout=5)
        projects = res.json()
        if not projects:
            print("No projects found.")
            return
        
        project_id = projects[0]["id"]
        print(f"Using Project ID: {project_id}")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    # 2. Test Case 1: Hourly Rate, Inherit Mode (Defaults)
    # Rate: $50/hr
    # Casual: False
    # Defaults should give: Prep 10d @ 8h, Shoot 20d @ 10h, Post 10d @ 8h
    # Prep: 10 * 8 * 50 = 4000
    # Shoot: 20 * 10 * 50 = 10000 (plus potential OT if 10h triggers it?)
    #   Pay rules: 0-7.6 (1x), 7.6-9.6 (1.5x), 9.6-10 (2x)
    #   10h cost: (7.6*50) + (2*75) + (0.4*100) = 380 + 150 + 40 = 570/day
    #   20 days * 570 = 11400
    # Post: 10 * 8 * 50 = (7.6*50) + (0.4*75) = 380 + 30 = 410/day -> 4100
    # Total Gross approx: 4000 + 11400 + 4100 = 19500 (approx check with OT on 8h days??)
    # Wait, Post at 8h: 7.6*50 + 0.4*75 = 380+30 = 410. Correct.
    # Prep at 8h: same = 410. 10 * 410 = 4100.
    # Total: 4100 + 11400 + 4100 = 19600.
    
    print("\nTest Case 1: Inherit Mode (Defaults)")
    payload_1 = {
        "base_hourly_rate": 50.0,
        "is_casual": False,
        "is_artist": False,
        "calendar_mode": "inherit",
        "project_id": project_id
    }
    
    try:
        res1 = requests.post(f"{BASE_URL}/calculate-labor-cost", json=payload_1, timeout=10)
        if res1.status_code == 200:
            data = res1.json()
            print(f"Total Cost: ${data['total_cost']}")
            print("Breakdown:")
            for phase, info in data["breakdown"].items():
                print(f"  {phase}: {info['days']} days, ${info['cost']}")
            print("Fringes:")
            print(json.dumps(data["fringes"], indent=2))
            
            # Validation
            total_parts = sum(d['cost'] for d in data['breakdown'].values())
            print(f"Sum of parts: {total_parts}")
        else:
            print(f"Error: {res1.status_code} {res1.text}")
    except Exception as e:
        print(f"Req 1 failed: {e}")

    # 3. Test Case 2: Custom Dates (Weekend)
    # Rate: $50, Saturday work
    print("\nTest Case 2: Custom Dates (Saturday)")
    
    # 2 Saturdays
    dates_sat = ["2026-02-07", "2026-02-14"] # Saturdays
    
    payload_2 = {
        "base_hourly_rate": 50.0,
        "is_casual": False,
        "is_artist": False,
        "calendar_mode": "custom",
        "phase_details": {
            "shoot": {
                "defaultHours": 10.0,
                "dates": dates_sat  
            }
        },
        "project_id": project_id
    }
    
    try:
        res2 = requests.post(f"{BASE_URL}/calculate-labor-cost", json=payload_2, timeout=10)
        if res2.status_code == 200:
            data = res2.json()
            print(f"Total Cost: ${data['total_cost']}")
            if 'shoot' in data['breakdown']:
                print(f"Shoot cost: ${data['breakdown']['shoot']['cost']}")
            else:
                print("No shoot breakdown found")
            # Sat logic: 0-7.6 (1.5x) -> 7.6*75 = 570
            # 7.6-9.6 (1.75x) -> 2*87.5 = 175
            # 9.6-10 (2.0x) -> 0.4*100 = 40
            # Total daily: 570+175+40 = 785
            # 2 days = 1570
            print(f"Expected Shoot Cost: $1570.0")
        else:
            print(f"Error: {res2.text}")
    except Exception as e:
        print(f"Req 2 failed: {e}")

if __name__ == "__main__":
    verify()
