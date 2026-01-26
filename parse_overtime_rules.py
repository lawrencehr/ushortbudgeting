"""
Comprehensive Payguide PDF Parser
Extracts overtime bracket rules and maps them to classifications
"""
import json
import re

# Read the PDF text extraction
print("Reading PDF text extraction...")
with open('sample_text.txt', 'rb') as f:
    content = f.read()
    text = content.decode('utf-16le')
    lines = [line.strip() for line in text.split('\n') if line.strip()]

print(f"Loaded {len(lines)} lines from PDF\n")

# Read the existing JSON data
with open('pay_rates_v2.json', 'r') as f:
    json_data = json.load(f)

print(f"Loaded {len(json_data['sections'])} sections from JSON\n")

# Analyze the structure
print("="*80)
print("ANALYZING PDF STRUCTURE")
print("="*80)

# Find table headers
for i, line in enumerate(lines[:100]):
    if 'Classification' in line and 'Weekly' in line:
        print(f"\nFound table header at line {i}:")
        print(f"  {line}")
        # Print next few lines to see structure
        for j in range(i+1, min(i+15, len(lines))):
            if lines[j]:
                print(f"  {j}: {lines[j]}")
                if 'Technician A' in lines[j]:
                    print(f"    ^ Found Technician A data")
                    break

# Find overtime headers  
print("\n" + "="*80)
print("SEARCHING FOR OVERTIME SECTIONS")
print("="*80)

for i, line in enumerate(lines):
    if 'Overtime' in line and ('Monday' in line or 'first' in line or 'after' in line):
        print(f"\nLine {i}: {line}")
        # Show context
        for j in range(max(0, i-2), min(len(lines), i+12)):
            if lines[j]:
                marker = "  >>> " if j == i else "      "
                print(f"{marker}{j}: {lines[j]}")

# Analyze raw_values structure from JSON
print("\n" + "="*80)
print("ANALYZING JSON RAW_VALUES STRUCTURE")
print("="*80)

# Get Technician A+ as example
for section in json_data['sections']:
    for cls in section['classifications']:
        if 'Technician A+' == cls.get('classification'):
            print(f"\nClassification: {cls['classification']}")
            print(f"Section: {section['section_name']}")
            print(f"Base hourly: ${cls.get('base_hourly')}")
            print(f"Weekly rate: ${cls.get('weekly_rate')}")
            print(f"Raw values ({len(cls['raw_values'])} items):")
            
            raw_vals = cls['raw_values']
            base = cls.get('base_hourly')
            
            for idx, val in enumerate(raw_vals):
                if val and base and val != base:
                    multiplier = val / base if base > 0 else 0
                    print(f"  [{idx}] ${val:>7.2f}  (×{multiplier:.2f})")
                else:
                    print(f"  [{idx}] ${val:>7.2f}")
            
            break
    break

print("\n" + "="*80)
print("Analysis complete. Now mapping rate types...")
print("="*80)
