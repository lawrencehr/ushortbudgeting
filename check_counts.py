import json

with open('pay_rates_v2.json', 'r') as f:
    data = json.load(f)

total_source = 0
skipped_no_raw = 0
skipped_short_raw = 0
skipped_zero_base = 0
valid_count = 0

print(f"{'Section Name':<60} | {'Total':<6} | {'Valid':<6} | {'Skipped':<8}")
print("-" * 90)

for section in data.get('sections', []):
    s_name = section.get('section_name', 'Unknown')[:60]
    s_total = len(section.get('classifications', []))
    s_valid = 0
    
    for cls in section.get('classifications', []):
        total_source += 1
        
        raw = cls.get('raw_values', [])
        base = cls.get('base_hourly', 0)
        
        if not raw:
            skipped_no_raw += 1
            continue
            
        if len(raw) < 7:
            skipped_short_raw += 1
            continue
            
        if base == 0:
            skipped_zero_base += 1
            continue
            
        s_valid += 1
        valid_count += 1
    
    print(f"{s_name:<60} | {s_total:<6} | {s_valid:<6} | {s_total - s_valid:<8}")

print("-" * 90)
print(f"Total Source Classifications: {total_source}")
print(f"Total Valid for Tiered Rates: {valid_count}")
print(f"Skipped - No Raw Values: {skipped_no_raw}")
print(f"Skipped - Short Raw Values (<7 items): {skipped_short_raw}")
print(f"Skipped - Zero Base Hourly: {skipped_zero_base}")
