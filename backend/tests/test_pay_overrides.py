
# ... imports ...
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from rate_lookup_service import RateLookupService

@pytest.fixture
def service():
    return RateLookupService()

# ... existing tests ...

def test_override_base_rate(service):
    # Test Crew Saturday with explicit rate override (no DB lookup)
    # Rate = $100
    # Sat: 0-7.6 @ 1.5, 7.6-9.6 @ 1.75
    # 8 hours:
    # 7.6 * 1.5 * 100 = 1140
    # 0.4 * 1.75 * 100 = 70.0
    # Total = 1210.0
    
    cost = service.calculate_day_cost(
        classification="Dummy",
        hours=8.0,
        day_type="SATURDAY",
        override_base_rate=100.0,
        override_is_casual=False,
        override_section_name="Crew"
    )
    assert cost["day_cost"] == 1210.0
    assert cost["base_hourly"] == 100.0

def test_override_is_casual(service):
    # Test Crew Casual Weekday Override
    # Rate = $100
    # Casual Weekday: 0-7.6 @ 1.25
    # 8 hours:
    # 7.6 * 1.25 * 100 = 950
    # 0.4 * 1.875 * 100 = 75
    # Total = 1025
    
    cost = service.calculate_day_cost(
        classification="Dummy",
        hours=8.0,
        day_type="WEEKDAY",
        override_base_rate=100.0,
        override_is_casual=True,
        override_section_name="Crew"
    )
    assert cost["day_cost"] == 1025.0

def test_override_section_artist(service):
    # Test Artist Override
    # Rate = $100
    # Artist Sun: 2.0x
    # 8h -> 1600
    
    cost = service.calculate_day_cost(
        classification="Dummy",
        hours=8.0,
        day_type="SUNDAY",
        override_base_rate=100.0,
        override_is_casual=False, # Perm Artist
        override_section_name="Category E - Artist"
    )
    assert cost["day_cost"] == 1600.0
