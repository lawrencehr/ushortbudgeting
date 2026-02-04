import json
import re
import os

def parse_and_generate():
    categories = []
    current_cat = None
    
    # Read from the permanent reference file
    file_path = os.path.join(os.path.dirname(__file__), 'budget_structure_reference.txt')
    try:
        with open(file_path, 'r') as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
    except FileNotFoundError:
        print(f"Error: Could not find {file_path}")
        return

    for line in lines:
        # Check for Category
        # Matches "Category A: Name" or "Category E(b): Name"
        cat_match = re.match(r"^Category\s+([A-Z](?:\([a-z]\))?):\s+(.*)$", line, re.IGNORECASE)
        if cat_match:
            code = cat_match.group(1) # Keep case as captured, e.g. E(b)
            # The prompt used "Category E(b)", let's keep it as is.
            # However, typically codes are uppercase. "E(b)" has mixed case.
            # Let's trust the captured group.
            
            name = cat_match.group(2).strip()
            
            current_cat = {
                "id": code,
                "code": code,
                "name": name,
                "groupings": [],
                "total": 0 
            }
            categories.append(current_cat)
            continue
            
        # Check for Grouping
        if current_cat:
            # Matches "Grouping A.1: Name" or "Grouping E(b)2: Name"
            # Note: "Grouping: General Items" shouldn't match this if we enforce a code
            grp_match = re.match(r"^Grouping\s+([A-Z0-9\.\(\)a-z]+):\s+(.*)$", line, re.IGNORECASE)
            
            # Matches "Grouping: General Items" (with colon) or "Grouping General Items"
            general_match = re.match(r"^Grouping:?\s+General Items", line, re.IGNORECASE)
            
            if grp_match and not general_match:
                grp_code = grp_match.group(1)
                grp_name = grp_match.group(2).strip()
                
                current_cat['groupings'].append({
                    "id": f"{current_cat['code']}_{grp_code}",
                    "code": grp_code,
                    "name": grp_name,
                    "items": [],
                    "sub_total": 0
                })
            elif general_match:
                # General Items
                current_cat['groupings'].append({
                    "id": f"{current_cat['code']}_General",
                    "code": "",
                    "name": "General Items",
                    "items": [],
                    "sub_total": 0
                })
        
    # Post-process: Add 'General' grouping to categories with no groupings
    for cat in categories:
        if not cat['groupings']:
             cat['groupings'].append({
                "id": f"{cat['code']}_General",
                "code": "",
                "name": "General",
                "items": [],
                "sub_total": 0
             })

    # Save to budget_data.json
    output_path = os.path.join(os.path.dirname(__file__), 'budget_data.json')
    with open(output_path, 'w') as f:
        json.dump(categories, f, indent=4)
    
    print(f"Generated {len(categories)} categories in budget_data.json based on {file_path}")

if __name__ == "__main__":
    parse_and_generate()

