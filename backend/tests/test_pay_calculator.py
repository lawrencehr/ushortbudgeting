import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from rate_lookup_service import RateLookupService

@pytest.fixture
def service():
    return RateLookupService()

# --- Artists (Category E) ---

def test_artist_standard_weekday(service):
    # Mock classification to ensure it's seen as Artist
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Category E - Artists"
    }
    
    # Mon-Sat: 0-7.6 @ 1.0, 7.6-9.6 @ 1.5, >9.6 @ 2.0
    # 8 hours: 7.6 @ 1.0 + 0.4 @ 1.5 = 7.6 + 0.6 = 8.2 units
    # Base $50 -> $410
    cost = service.calculate_day_cost("Artist Standard", 8.0, day_type="WEEKDAY")
    assert cost["day_cost"] == 410.0
    assert "Base (1.0x)" in str(cost["breakdown"])
    assert "OT 1.5x" in str(cost["breakdown"])

def test_artist_standard_sunday(service):
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Category E - Artists"
    }
    # Sun: All @ 2.0
    # 8 hours: 8 @ 2.0 = 16 units
    # Base $50 -> $800
    cost = service.calculate_day_cost("Artist Standard", 8.0, day_type="SUNDAY")
    assert cost["day_cost"] == 800.0
    assert "Sunday (2.0x)" in str(cost["breakdown"])

def test_artist_casual_weekday(service):
    # Casual Artist Mon-Sat
    # 0-7.6 @ 1.25
    # 7.6-9.6 @ 1.875
    # 10 hours: 
    # 7.6 * 1.25 = 9.5
    # 2.0 * 1.875 = 3.75
    # 0.4 * 2.5 = 1.0
    # Total units = 14.25
    # Base $50 -> $50 * 14.25 = $712.5
    cost = service.calculate_day_cost("Casual Artist", 10.0, day_type="WEEKDAY")
    # Note: "Casual Artist" string triggers is_artist=True (if section empty, fallback?) 
    # Wait, existing service needs real data or mock?
    # The service loads 'data/award_rates.json'. If mock data not there, might fail.
    # We should mock _find_classification or ensure "Casual Artist" resolves to an artist section.
    
    # We'll use a mock for _find_classification to control inputs
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Category E - Artists",
        "hourly_rate": 50.0
    }
    
    cost = service.calculate_day_cost("Casual Artist", 10.0, day_type="WEEKDAY")
    assert cost["day_cost"] == 712.5

def test_artist_casual_sunday(service):
    # Casual Artist Sun: All @ 2.0
    # 8 hours: 16 units -> $800
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Category E - Artists"
    }
    cost = service.calculate_day_cost("Casual Artist", 8.0, day_type="SUNDAY")
    assert cost["day_cost"] == 800.0

# --- Crew ---

def test_crew_standard_saturday(service):
    # Crew Full-Time Sat
    # 0-7.6 @ 1.5, 7.6-9.6 @ 1.75
    # 8 hours: 
    # 7.6 * 1.5 = 11.4
    # 0.4 * 1.75 = 0.7
    # Total = 12.1
    # $50 -> $605
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Crew"
    }
    cost = service.calculate_day_cost("Grip", 8.0, day_type="SATURDAY")
    assert cost["day_cost"] == 605.0

def test_crew_casual_weekday(service):
    # Crew Casual M-F
    # 0-7.6 @ 1.25
    # 7.6-9.6 @ 1.875
    # 8 hours:
    # 7.6 * 1.25 = 9.5
    # 0.4 * 1.875 = 0.75
    # Total = 10.25 units
    # $50 -> $512.5
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Crew"
    }
    cost = service.calculate_day_cost("Casual Grip", 8.0, day_type="WEEKDAY")
    assert cost["day_cost"] == 512.5

def test_crew_casual_saturday(service):
    # Crew Casual Sat
    # 0-7.6 @ 1.75
    # 7.6-9.6 @ 2.1875
    # 8 hours:
    # 7.6 * 1.75 = 13.3
    # 0.4 * 2.1875 = 0.875
    # Total = 14.175 units
    # $50 -> 708.75
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Crew"
    }
    cost = service.calculate_day_cost("Casual Grip", 8.0, day_type="SATURDAY")
    assert cost["day_cost"] == 708.75

def test_crew_casual_sunday(service):
    # Crew Casual Sun
    # 0-7.6 @ 2.0
    # >7.6 @ 2.5
    # 8 hours:
    # 7.6 * 2.0 = 15.2
    # 0.4 * 2.5 = 1.0
    # Total = 16.2 units
    # $50 -> $810.0
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Crew"
    }
    cost = service.calculate_day_cost("Casual Grip", 8.0, day_type="SUNDAY")
    assert cost["day_cost"] == 810.0

def test_crew_casual_ph(service):
    # Crew Casual PH
    # All @ 3.125
    # 8 hours: 8 * 3.125 = 25 units
    # $50 -> $1250
    service._find_classification = lambda name: {
        "base_hourly": 50.0,
        "section_name": "Crew"
    }
    cost = service.calculate_day_cost("Casual Grip", 8.0, is_holiday=True)
    assert cost["day_cost"] == 1250.0
