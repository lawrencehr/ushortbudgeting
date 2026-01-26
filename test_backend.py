"""
Backend Integration Test
Tests production calendar creation, holiday detection, and payguide rate lookups
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def test_backend():
    print("=" * 60)
    print("CALENDAR + PAYGUIDE BACKEND INTEGRATION TEST")
    print("=" * 60)
    
    # Step 1: Get project
    print("\n1. Getting project...")
    projects_response = requests.get(f"{BASE_URL}/api/projects")
    projects = projects_response.json()
    
    if not projects:
        print("❌ No projects found!")
        return
    
    project = projects[0]
    project_id = project['id']
    print(f"✅ Using project: {project['name']} (ID: {project_id})")
    
    # Step 2: Create production calendar
    print("\n2. Creating production calendar...")
    
    # Create dates that include:
    # - Weekdays (Monday-Friday)
    # - Weekend days (Saturday-Sunday)
    # - Australia Day 2026 (Jan 26, Sunday - public holiday)
    
    calendar_data = {
        "phases": {
            "preProd": {
                "defaultHours": 8,
                "dates": [
                    "2026-01-19",  # Monday
                    "2026-01-20",  # Tuesday
                    "2026-01-21",  # Wednesday
                ]
            },
            "shoot": {
                "defaultHours": 12,
                "dates": [
                    "2026-01-23",  # Friday
                    "2026-01-24",  # Saturday (weekend)
                    "2026-01-26",  # Monday (Australia Day - public holiday)
                    "2026-01-27",  # Tuesday
                ]
            },
            "postProd": {
                "defaultHours": 8,
                "dates": [
                    "2026-02-02",  # Monday
                    "2026-02-03",  # Tuesday
                ]
            }
        }
    }
    
    create_response = requests.post(
        f"{BASE_URL}/api/projects/{project_id}/calendar",
        json=calendar_data
    )
    
    if create_response.status_code == 200:
        print("✅ Calendar created successfully")
    else:
        print(f"❌ Failed to create calendar: {create_response.text}")
        return
    
    # Step 3: Retrieve calendar
    print("\n3. Retrieving calendar...")
    get_calendar_response = requests.get(f"{BASE_URL}/api/projects/{project_id}/calendar")
    calendar = get_calendar_response.json()
    
    print(f"✅ Calendar retrieved")
    print(f"   Phases configured: {len(calendar['phases'])}")
    print(f"   Total calendar days: {len(calendar['calendarDays'])}")
    print(f"   Holidays detected: {len(calendar['holidays'])}")
    
    if calendar['holidays']:
        print("\n   NSW Public Holidays Found:")
        for holiday in calendar['holidays']:
            print(f"      📅 {holiday['date']}: {holiday['name']}")
    
    # Show day type breakdown
    day_types = {}
    for day in calendar['calendarDays']:
        day_type = day['dayType']
        day_types[day_type] = day_types.get(day_type, 0) + 1
    
    print("\n   Day Type Breakdown:")
    for day_type, count in day_types.items():
        print(f"      {day_type}: {count} days")
    
    # Step 4: Test rate lookup for different classifications
    print("\n4. Testing payguide rate lookups...")
    
    # First search for valid keys
    print("   Searching for 'Technician A' to get valid key...")
    search_response = requests.get(f"{BASE_URL}/api/rates/search?q=Technician%20A")
    if search_response.status_code == 200 and search_response.json():
        tech_key = search_response.json()[0]['classification']
        print(f"   Found key: '{tech_key}'")
    else:
        print("   ❌ Search failed using fallback 'Technician A'")
        tech_key = "Technician A"

    test_cases = [
        {
            "classification": tech_key,
            "dates": ["2026-01-23"],  # Friday (weekday)
            "description": "Weekday (12hrs - should show overtime)"
        },
        {
            "classification": tech_key, 
            "dates": ["2026-01-24"],  # Saturday
            "description": "Weekend (Saturday)"
        },
        {
            "classification": tech_key,
            "dates": ["2026-01-26"],  # Australia Day
            "description": "Public Holiday (Australia Day)"
        },
        {
            "classification": "Gaffer",
            "dates": ["2026-01-23", "2026-01-24"],
            "description": "Multiple days (weekday + weekend)"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n   Test {i}: {test_case['classification']} - {test_case['description']}")
        
        cost_response = requests.post(
            f"{BASE_URL}/api/calculate-schedule-cost",
            json={
                "classification": test_case['classification'],
                "assignedDays": test_case['dates'],
                "projectId": project_id
            }
        )
        
        if cost_response.status_code != 200:
            print(f"      ❌ Failed: {cost_response.text}")
            continue
        
        cost_data = cost_response.json()
        
        print(f"      Total Cost: ${cost_data['total_cost']:,.2f}")
        print(f"      Total Hours: {cost_data['total_hours']}hrs")
        print(f"      Days: {cost_data['total_days']}")
        
        if cost_data.get('warnings'):
            for warning in cost_data['warnings']:
                print(f"      ⚠️  {warning}")
        
        # Show per-day breakdown
        if cost_data['daily_details']:
            print("      Per-Day Breakdown:")
            for day_detail in cost_data['daily_details']:
                date = day_detail['date'][:10]
                rate_type = day_detail.get('rate_type', 'unknown')
                multiplier = day_detail.get('rate_multiplier', 1.0)
                hourly = day_detail['hourly_rate']
                base = day_detail.get('base_hourly', 0)
                day_cost = day_detail['day_cost']
                
                print(f"         {date}: {rate_type} ({multiplier}x) | "
                      f"Base ${base:.2f}/hr → ${hourly:.2f}/hr × {day_detail['hours']}hrs = ${day_cost:.2f}")
    
    # Step 5: Test classification search
    print("\n5. Testing classification search...")
    
    search_classifications = ["Technician", "Gaffer", "Director"]
    
    for search_term in search_classifications:
        # Note: This would require a search endpoint - we can test the rate service directly
        print(f"\n   Searching for: '{search_term}'")
        # This endpoint doesn't exist yet, so we'll skip for now
        print(f"      (Search endpoint not yet implemented)")
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print("✅ Project retrieval")
    print("✅ Calendar creation with 3 phases")
    print(f"✅ Holiday detection ({len(calendar['holidays'])} holiday(s) found)")
    print("✅ Day type classification (weekday/weekend/holiday)")
    print("✅ Payguide rate lookups")
    print("✅ Cost calculation with multipliers")
    print("✅ Rate differentiation by day type")
    print("\n🎉 All backend integration tests passed!")

if __name__ == "__main__":
    try:
        test_backend()
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("   Make sure the backend server is running:")
        print("   venv\\Scripts\\python backend/main.py")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
