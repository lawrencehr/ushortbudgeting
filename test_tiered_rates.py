"""
Test Tiered Overtime Calculations
Compares old vs new calculation methods
"""
import sys
sys.path.insert(0, 'backend')

from rate_lookup_service import get_rate_service

rate_service = get_rate_service()

print("=" * 80)
print("TIERED OVERTIME CALCULATION TEST")
print("=" * 80)

# Test cases
test_cases = [
    {"classification": "Technician A", "hours": 8, "day_type": "WEEKDAY", "description": "8-hour weekday (no OT)"},
    {"classification": "Technician A", "hours": 10, "day_type": "WEEKDAY", "description": "10-hour weekday (2hrs OT @1.5x)"},
    {"classification": "Technician A", "hours": 12, "day_type": "WEEKDAY", "description": "12-hour weekday (2hrs @1.5x + 2hrs @2.0x)"},
    {"classification": "Technician A", "hours": 14, "day_type": "WEEKDAY", "description": "14-hour weekday (2hrs @1.5x + 4hrs @2.0x)"},
    {"classification": "Supervising technician A+", "hours": 12, "day_type": "WEEKDAY", "description": "Supervising tech 12hrs"},
]

for test in test_cases:
    print(f"\n{'='*80}")
    print(f"TEST: {test['description']}")
    print(f"Classification: {test['classification']}")
    print(f"Hours: {test['hours']}")
    print(f"{'='*80}")
    
    result = rate_service.calculate_day_cost(
        classification=test['classification'],
        hours=test['hours'],
        day_type=test['day_type']
    )
    
    print(f"\nBase Rate: ${result['base_hourly']:.2f}/hr")
    print(f"Total Cost: ${result['day_cost']:.2f}")
    print(f"\nTier Breakdown:")
    
    for tier in result.get('tier_breakdown', []):
        print(f"  Hours {tier['hours_range']}: {tier['hours']} hrs × ${tier['rate']:.2f}/hr ({tier['multiplier']:.2f}x) = ${tier['cost']:.2f}")
        print(f"    Description: {tier['description']}")
    
    # Show old calculation for comparison
    if test['hours'] > 8:
        old_incorrect_cost = result['base_hourly'] * 2.0 * test['hours']
        print(f"\n❌ OLD METHOD (incorrect uniform 2x): ${old_incorrect_cost:.2f}")
        savings = old_incorrect_cost - result['day_cost']
        print(f"✅ NEW METHOD (tiered brackets): ${result['day_cost']:.2f}")
        print(f"💰 Cost difference: ${savings:.2f} (old method overcharged)")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
