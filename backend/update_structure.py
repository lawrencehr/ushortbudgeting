import json
import re

raw_text = """
Category A: Story & Script / Development
  Grouping A.1: STORY & SCRIPT
  Grouping A.2: DEVELOPMENT

Category B: Producers & Directors
  Grouping B.1: PRODUCERS
  Grouping B.2: DIRECTORS

Category C: PRODUCTION UNIT FEES & SALARIES
  Grouping C.1: PRODUCTION MANAGEMENT
  Grouping C.2: PRODUCTION ACCOUNTANCY
  Grouping C.3: ASSISTANT DIRECTORS & SCRIPT SUPERVISION
  Grouping C.4: CAMERA CREW
  Grouping C.5: SOUND CREW
  Grouping C.6: LIGHTING CREW
  Grouping C.7: GRIPS CREW
  Grouping C.8: COSTUME CREW
  Grouping C.9: MAKE-UP CREW
  Grouping C.11: ART DEPARTMENT CREW
  Grouping C.12: CONSTRUCTION CREW
  Grouping C.13: OCCUPATIONAL HEALTH & SAFETY CREW
  Grouping C.14: OVERTIME & LOADINGS

Category D: FRINGES & WORKERS COMPENSATION
  Grouping General Items:

Category E: Cast Below Line
  Grouping E.2: CAST - PRINCIPALS
  Grouping E.3: CAST - SUPPORTS
  Grouping E.4: STANDINS & DOUBLES
  Grouping E.6: EXTRAS

Category F: Costumes & Make-Up
  Grouping F.1: COSTUMES
  Grouping F.2: MAKE-UP & HAIRDRESSING

Category G: Locations
  Grouping G.1: LOCATIONS

Category H: SETS & PROPERTIES
  Grouping H.1: CONSTRUCTION
  Grouping H.2: PROPS & SET DRESSING

Category J: DIGITAL VIDEO PRODUCTION

Category K: EQUIPMENT & STORES
  Grouping K.1: CAMERA EQUIPMENT & STORES
  Grouping K.2: SOUND EQUIPMENT & STORES
  Grouping K.3: LIGHTING EQUIPMENT & STORES
  Grouping K.4: GRIPS EQUIPMENT & STORES
  Grouping K.5: UNIT FACILITIES & STORES
  Grouping K.6: SAFETY EQUIPMENT & STORES

Category L: RENTALS & STORAGE
  Grouping General Items:

Category M: TRAVEL & TRANSPORT
  Grouping General Items:

Category N: ACCOMMODATION, LIVING, CATERING
  Grouping General Items:

Category O: INSURANCES
  Grouping General Items:

Category P: OFFICE EXPENSES
  Grouping General Items:

Category R: POST-PRODUCTION CREW
  Grouping General Items:

Category S: POST-PRODN. RENTALS & OFFICE EXPENSES
  Grouping General Items:

Category W: MUSIC
  Grouping General Items:

Category X: Publicity & Delivery
  Grouping X.1: PUBLICITY & STILLS - PRODUCTION & POST PRODN.
  Grouping X.2: DELIVERY REQUIREMENTS

Category Y: LEGAL & BUSINESS
  Grouping General Items:

Category Z: OVERHEADS
  Grouping General Items:
"""

def parse_and_generate():
    categories = []
    current_cat = None
    
    # Split by lines
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    
    for line in lines:
        # Check for Category
        cat_match = re.match(r"^Category\s+([A-Z]):\s+(.*)$", line, re.IGNORECASE)
        if cat_match:
            code = cat_match.group(1).upper()
            name = cat_match.group(2).strip()
            
            # Remove (Permanent) / (Casual) if present (per user request)
            name = name.replace("(Permanent)", "").replace("(Casual)", "").replace("(permanent)", "").replace("(casual)", "").strip()
            
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
            grp_match = re.match(r"^Grouping\s+([A-Z0-9\.]+):\s+(.*)$", line, re.IGNORECASE)
            general_match = re.match(r"^Grouping\s+General Items:", line, re.IGNORECASE)
            
            if grp_match:
                grp_code = grp_match.group(1)
                grp_name = grp_match.group(2).strip()
                grp_name = grp_name.replace("(Permanent)", "").replace("(Casual)", "").replace("(permanent)", "").replace("(casual)", "").strip()
                
                current_cat['groupings'].append({
                    "id": f"{current_cat['code']}_{grp_code}", # simple ID generation
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
        
        # If a category has no groupings listed but exists (like Category J), we should probably add a default one or just leave it empty?
        # User list: "Category J: DIGITAL VIDEO PRODUCTION" then immediately "Category K".
        # So J has no groupings listed.
        # I'll check after loop.

    # Post-process: Add 'General' grouping to categories with no groupings if that's standard logic, 
    # OR leave them empty. Based on "Category J", maybe it's just a header?
    # But files usually need at least one grouping to add items.
    # Given the user specifically wrote "Grouping General Items:" for others, J might be intentionally empty or missed.
    # I'll add a "General" grouping to J just in case so it's usable.
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
    with open('budget_data.json', 'w') as f:
        json.dump(categories, f, indent=4)
    
    print(f"Generated {len(categories)} categories in budget_data.json")

if __name__ == "__main__":
    parse_and_generate()
