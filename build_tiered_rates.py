"""
Build tiered overtime rate database from final_pay_rates.json
Maps named keys to overtime brackets structure
"""
import json
import os

# Read the JSON data
INPUT_FILE = 'final_pay_rates.json'
OUTPUT_FILE = 'backend/tiered_rates.json'

if not os.path.exists(INPUT_FILE):
    print(f"Error: {INPUT_FILE} not found. Run extract_pay_rates_v3.py first.")
    exit(1)

with open(INPUT_FILE, 'r') as f:
    json_data = json.load(f)

# Build tiered rate database
tiered_rates_db = {}

# Helper to safe get float
def get_val(item, key, default=0.0):
    val = item.get(key)
    if val is None: return default
    return float(val)

count = 0
for cls in json_data['classifications']:
    classification = cls.get('classification', '')
    if not classification: continue
    
    base_hourly = get_val(cls, 'hourly_rate')
    if base_hourly == 0: continue
    
    # Handle duplicates by appending index if needed (simple collision avoidance)
    classification_key = classification
    if classification_key in tiered_rates_db:
        classification_key = f"{classification} (Duplicate)"
    
    # Extract Rates using Keys
    # OT M-F
    ot_mf_1 = get_val(cls, 'ot_mon_fri_first_2h', base_hourly * 1.5)
    ot_mf_2 = get_val(cls, 'ot_mon_fri_after_2h', base_hourly * 2.0)
    
    # Weekend
    sat_rate = get_val(cls, 'penalty_saturday', base_hourly * 1.5)
    if sat_rate == 0: sat_rate = get_val(cls, 'ot_sat_first_2h', base_hourly * 1.5)
    
    sun_rate = get_val(cls, 'penalty_sunday', base_hourly * 2.0)
    if sun_rate == 0: sun_rate = get_val(cls, 'ot_sunday', base_hourly * 2.0)
    
    # Public Holiday
    ph_rate = get_val(cls, 'penalty_public_holiday', base_hourly * 2.5)
    if ph_rate == 0: ph_rate = get_val(cls, 'ot_public_holiday', base_hourly * 2.5)

    # Build Structure
    tiered_rates_db[classification_key] = {
        "base_hourly": base_hourly,
        "original_name": classification,
        "section": "Main", # Todo: extract if available
        "weekday_brackets": [
            {
                "hours_range": [0, 8],
                "description": "Standard time",
                "rate": base_hourly,
                "multiplier": 1.0
            },
            {
                "hours_range": [8, 10],
                "description": "Overtime - first 2 hours",
                "rate": ot_mf_1,
                "multiplier": round(ot_mf_1 / base_hourly, 2)
            },
            {
                "hours_range": [10, float('inf')],
                "description": "Overtime - after 2 hours",
                "rate": ot_mf_2,
                "multiplier": round(ot_mf_2 / base_hourly, 2)
            }
        ],
        "saturday": {
            "rate": sat_rate,
            "multiplier": round(sat_rate / base_hourly, 2)
        },
        "sunday": {
            "rate": sun_rate,
            "multiplier": round(sun_rate / base_hourly, 2)
        },
        "public_holiday": {
            "rate": ph_rate,
            "multiplier": round(ph_rate / base_hourly, 2)
        }
    }
    count += 1

# Output status
print(f"Tiered Rate Database Built! Processed {count} classifications.")
print(f"Total entries: {len(tiered_rates_db)}\n")

# Save
with open(OUTPUT_FILE, 'w') as f:
    json.dump(tiered_rates_db, f, indent=2)

print(f"✅ Saved to {OUTPUT_FILE}")
