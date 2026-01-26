from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Allowance:
    """
    Represents an allowance (add-on) to the labor rate.
    """
    name: str
    cost: float
    is_daily: bool = False
    is_weekly: bool = False
    is_hourly: bool = True  # Default to hourly as it's most common

@dataclass
class LaborConfig:
    """
    Configuration for labor rate calculations.
    """
    base_rate: float
    # List of (hours_threshold, multiplier). e.g., [(8, 1.5), (10, 2.0)]
    # Means: up to 8h is standard (or previous tier), 8-10h is 1.5x, >10h is 2.0x.
    # Note: Logic usually implies standard time is up to the first threshold.
    # A cleaner way: thresholds should imply "After X hours, apply Y multiplier".
    # Typically: STANDARD -> >8h (1.5x) -> >10h (2.0x).
    # We will assume these are "After this many total hours in the day/shift".
    ot_thresholds: List[tuple[float, float]]
    casual_loading_percent: float = 0.0  # e.g. 25.0 for 25%

def calculate_complex_rate(
    hours: float,
    config: LaborConfig,
    allowances: Optional[List[Allowance]] = None
) -> float:
    """
    Calculates the total cost for a shift based on hours, base rate, OT, and allowances.
    
    Args:
        hours: Total hours worked in the shift.
        config: LaborConfig object containing rates and rules.
        allowances: Optional list of Allowance objects.
    
    Returns:
        Total dollar amount for the shift.
    """
    if allowances is None:
        allowances = []

    # 1. Apply casual loading to base rate if applicable
    # Casual loading usually applies to the base rate. 
    # OT is often calculated on the loaded base rate or unloaded depending on the award.
    # We will assume standard Australian approach: OT multipliers apply to the base rate, 
    # and casual loading is an add-on or sometimes part of the multiplier base.
    # *However*, a common simplistic interpretation is: EffectiveBase = Base * (1 + Loading/100).
    # Then OT multipliers apply to that.
    # Let's clarify: In many awards like GRIA, Casual gets 25% loading. OT is then specific:
    # First 2h @ 150% (of base? or of loaded? usually strictly defined).
    # Usually: Casual OT rates are distinct (e.g., 175%, 225%) which implicitly includes loading.
    # BUT for a generic engine, let's treat casual loading as a modifier to the base rate 
    # used for ALL calculations unless specific OT multipliers override it.
    # Actually, often casual loading is just +25% of base, and OT is e.g. 1.5x Base.
    # To keep this "complex" but "correct-enough-for-generic":
    # We will calculate a "Standard Hour Value" and "OT Hour Value".
    # If casual, Standard Hour = Base * 1.25.
    # OT Hour 1.5x = Base * 1.5 (NOT Base * 1.25 * 1.5 usually, though sometimes yes).
    # *Decision*: We will apply loading to the base rate first, effectively creating a "Loaded Base Rate".
    # And apply multipliers to that. This is the safest "generous" interpretation for budgeting data.
    
    effective_base = config.base_rate * (1 + config.casual_loading_percent / 100.0)
    
    total_pay = 0.0
    
    # 2. Calculate Base vs OT Pay
    # Sort thresholds just in case
    sorted_thresholds = sorted(config.ot_thresholds, key=lambda x: x[0])
    
    # We need to slice the hours into chunks.
    # Example: 12 hours total. Thresholds: [(8, 1.5), (10, 2.0)]
    # 0-8  : 1.0x
    # 8-10 : 1.5x
    # 10-12: 2.0x
    
    current_hour_cursor = 0.0
    remaining_hours = hours
    
    # We usually implicitly start with a 0 threshold for 1.0x? No, standard is up to first threshold.
    # Let's build a set of intervals.
    
    previous_threshold = 0.0
    previous_multiplier = 1.0
    
    for threshold_hours, multiplier in sorted_thresholds:
        if hours <= previous_threshold:
            break
            
        # Hours in this band
        band_hours = min(hours, threshold_hours) - previous_threshold
        band_hours = max(0, band_hours) # Safety
        
        total_pay += band_hours * effective_base * previous_multiplier
        
        previous_threshold = threshold_hours
        previous_multiplier = multiplier
        
    # Handle remaining hours above the last threshold (or if no thresholds)
    if hours > previous_threshold:
        band_hours = hours - previous_threshold
        total_pay += band_hours * effective_base * previous_multiplier

    # 3. Add Allowances
    for allow in allowances:
        # Simplification: Weekly allowances need context we don't have (week cycle).
        # We will assume 'is_weekly' means "Applied once per week, and this call represents that one time"
        # OR we just add it purely as cost.
        # But for 'is_hourly', we multiply by hours.
        if allow.is_hourly:
            total_pay += allow.cost * hours
        else:
            # Daily or one-off weekly allowance treated as flat cost for this calculation event
            total_pay += allow.cost

    return round(total_pay, 2)


if __name__ == "__main__":
    print("--- Testing Labor Engine ---")
    
    # Test Case 1: Standard Day, no OT, no Loading
    cfg_std = LaborConfig(base_rate=50.0, ot_thresholds=[(8, 1.5), (10, 2.0)])
    # 8 hours @ 50 = 400
    cost = calculate_complex_rate(8, cfg_std)
    print(f"Test 1 (8h, $50/h): Expected $400.0, Got ${cost}")
    assert cost == 400.0
    
    # Test Case 2: OT Day (12 hours)
    # 0-8 (8h) @ 50 * 1.0 = 400
    # 8-10 (2h) @ 50 * 1.5 = 75 * 2 = 150
    # 10-12 (2h) @ 50 * 2.0 = 100 * 2 = 200
    # Total = 750
    cost_ot = calculate_complex_rate(12, cfg_std)
    print(f"Test 2 (12h, $50/h, OT >8@1.5, >10@2.0): Expected $750.0, Got ${cost_ot}")
    assert cost_ot == 750.0
    
    # Test Case 3: Casual Loading (25%)
    # Effective Base = 50 * 1.25 = 62.5
    # 10 hours work:
    # 0-8 (8h) @ 62.5 * 1.0 = 500
    # 8-10 (2h) @ 62.5 * 1.5 = 93.75 * 2 = 187.5
    # Total = 687.5
    cfg_casual = LaborConfig(base_rate=50.0, ot_thresholds=[(8, 1.5), (10, 2.0)], casual_loading_percent=25.0)
    cost_casual = calculate_complex_rate(10, cfg_casual)
    print(f"Test 3 (10h Casual +25%): Expected $687.5, Got ${cost_casual}")
    assert cost_casual == 687.5
    
    # Test Case 4: Allowances
    # 8h standard
    # Meal (Daily) = $20
    # Dirt Money (Hourly) = $2/h * 8 = $16
    # Base = 400
    # Total = 436
    allowances = [
        Allowance(name="Meal", cost=20.0, is_daily=True, is_hourly=False),
        Allowance(name="Dirt", cost=2.0, is_hourly=True)
    ]
    cost_allow = calculate_complex_rate(8, cfg_std, allowances)
    print(f"Test 4 (8h + Allowances): Expected $436.0, Got ${cost_allow}")
    assert cost_allow == 436.0

    print("--- All Tests Passed ---")
