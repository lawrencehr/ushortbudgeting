import json
import re
import os
import logging

logging.basicConfig(level=logging.INFO)

INPUT_FILE = "pay_rates_v2.json"
OUTPUT_FILE = "backend/rates.json"

def clean_money(val):
    if val is None: return 0.0
    if isinstance(val, (int, float)): return float(val)
    # If it's a string, try to parse
    if isinstance(val, str):
        val = val.replace('$', '').replace(',', '')
        try: return float(val)
        except: return 0.0
    return 0.0

def normalize_key(s):
    return s.lower().replace(" ", "_").replace("-", "_").replace("&", "and").replace("/", "_")

def transform():
    if not os.path.exists(INPUT_FILE):
        logging.error(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    structured_data = {}
    stats = {"processed": 0, "skipped": 0}

    for section in data.get("sections", []):
        section_name = section.get("section_name", "")
        # Heuristics for Award/Type
        # E.g. "Television broadcasting - Full-time & part-time"
        
        lower_name = section_name.lower()
        award_key = "broadcasting" # Default bucket
        if "cinema" in lower_name: award_key = "cinema"
        elif "artist" in lower_name: award_key = "artists"
        elif "musician" in lower_name: award_key = "musicians"
        elif "journal" in lower_name: award_key = "journalists"
        else: award_key = "television_broadcasting" # Fallback

        type_key = "full_time"
        if "casual" in lower_name: type_key = "casual"
        
        if award_key not in structured_data:
            structured_data[award_key] = {}
        if type_key not in structured_data[award_key]:
            structured_data[award_key][type_key] = {}

        for item in section.get("classifications", []):
            cls_name = item.get("classification")
            if not cls_name: continue
            
            # Use 'base_hourly' if available
            base = item.get("base_hourly", 0)
            weekly = item.get("weekly_rate", 0)
            
            # If 0, try finding it in raw values
            if base == 0 and item.get("raw_values"):
                # Heuristic fallback
                vals = [clean_money(x) for x in item["raw_values"]]
                # Filter for reasonable hourly rate
                hourly_candidates = [x for x in vals if 20 < x < 150]
                if hourly_candidates:
                    base = min(hourly_candidates) # Generally base is lowest in the row (OT is higher)
            
            if base == 0 and weekly > 0:
                base = round(weekly / 38, 2) # Assume 38h week

            if base == 0:
                stats["skipped"] += 1
                continue

            # Calculate OT
            ot_1_5 = round(base * 1.5, 2)
            ot_2_0 = round(base * 2.0, 2)

            structured_data[award_key][type_key][cls_name] = {
                "base": base,
                "ot_1_5": ot_1_5,
                "ot_2_0": ot_2_0,
                "weekly_rate": weekly if weekly > 0 else round(base * 38, 2), # Estimate
                "raw_source": section_name
            }
            stats["processed"] += 1

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(structured_data, f, indent=2)

    logging.info(f"Transformation complete. Saved to {OUTPUT_FILE}")
    logging.info(f"Stats: {stats}")

if __name__ == "__main__":
    transform()