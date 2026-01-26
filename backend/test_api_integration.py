from main import calculate_weekly_labor_rate, LaborCalcRequest, LaborAllowance

def test_integration():
    print("--- Integration Test: API -> Labor Engine ---")
    
    # Case 1: Standard 40h week (5 days x 8h), $50/h
    # Daily: 8h @ $50 = $400
    # Weekly: $2000
    req1 = LaborCalcRequest(
        base_hourly_rate=50.0,
        daily_hours=8.0,
        days_per_week=5.0,
        is_casual=False
    )
    res1 = calculate_weekly_labor_rate(req1)
    print(f"Test 1 (Standard): Expected $2000.0, Got ${res1}")
    assert res1 == 2000.0
    
    # Case 2: Casual 10h day (2h OT), $50/h base
    # Loading: +25% -> Base $62.50
    # Daily: 8h @ 62.5 (500) + 2h @ 93.75 (187.5) = 687.5
    # Weekly (5 days): 3437.5
    req2 = LaborCalcRequest(
        base_hourly_rate=50.0,
        daily_hours=10.0,
        days_per_week=5.0,
        is_casual=True,
        ot_threshold_15=8.0,
        ot_threshold_20=10.0
    )
    res2 = calculate_weekly_labor_rate(req2)
    print(f"Test 2 (Casual OT): Expected $3437.5, Got ${res2}")
    assert res2 == 3437.5
    
    # Case 3: Allowances
    # Standard Day (8h, $50 -> $400 daily base)
    # Daily Allowance $20 -> $420 daily -> $2100 weekly
    # Weekly Allowance $100 -> $2200 weekly total
    req3 = LaborCalcRequest(
        base_hourly_rate=50.0,
        daily_hours=8.0,
        days_per_week=5.0,
        is_casual=False,
        allowances=[
            LaborAllowance(name="Meal", amount=20.0, frequency="day"),
            LaborAllowance(name="Phone", amount=100.0, frequency="week")
        ]
    )
    res3 = calculate_weekly_labor_rate(req3)
    print(f"Test 3 (Allowances): Expected $2200.0, Got ${res3}")
    assert res3 == 2200.0
    
    print("--- Integration Tests Passed ---")

if __name__ == "__main__":
    test_integration()
