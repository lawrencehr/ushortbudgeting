
import json
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "backend", "budget_data.json")
BACKUP_FILE = os.path.join(BASE_DIR, "backend", "budget_data.backup.json")

# Target Schema Definition
SCHEMA = [
    {
        "id": "A", "name": "Story & Script / Development",
        "groupings": [
            {"code": "A.1", "name": "STORY & SCRIPT", "items": ["Writers Fees"]},
            {"code": "A.2", "name": "DEVELOPMENT", "items": ["Legal Expenses allow"]}
        ]
    },
    {
        "id": "B", "name": "Producers & Directors",
        "groupings": [
            {"code": "B.1", "name": "PRODUCERS", "items": ["Executive Producer Fees", "Producer (Permanent)", "Holiday Pay & Fringes"]},
            {"code": "B.2", "name": "DIRECTORS", "items": ["Fees", "Director (Permanent)", "Holiday Pay & Fringes"]}
        ]
    },
    {
        "id": "C", "name": "PRODUCTION UNIT FEES & SALARIES",
        "groupings": [
            {"code": "C.1", "name": "PRODUCTION MANAGEMENT", "items": ["Production Manager", "Production Co-ordinator", "Production Secretary", "Runner(s)"]},
            {"code": "C.2", "name": "PRODUCTION ACCOUNTANCY", "items": ["Production Accountant"]},
            {"code": "C.3", "name": "ASSISTANT DIRECTORS & SCRIPT SUPERVISION", "items": ["1st Assistant Director (Casual)"]},
            {"code": "C.4", "name": "CAMERA CREW", "items": ["D. o. P. / operator (Casual)", "Assistant Camera Operator (Casual)"]},
            {"code": "C.5", "name": "SOUND CREW", "items": ["Recordist (Casual) - Senior Audio Director B", "Boom Operator"]},
            {"code": "C.6", "name": "LIGHTING CREW", "items": ["Gaffer (Casual) - Lighting Operator A"]},
            {"code": "C.7", "name": "GRIPS CREW", "items": ["Key Grip"]},
            {"code": "C.8", "name": "COSTUME CREW", "items": ["Costume Designer", "Standby Costume"]},
            {"code": "C.9", "name": "MAKE-UP CREW", "items": ["Make-up Artist (Casual)", "Assistant(s)"]},
            {"code": "C.11", "name": "ART DEPARTMENT CREW", "items": ["Art Dir / Wardrobe (Casual) - Senior Set Designer", "Art Department Co-ordinator", "Standby"]},
            {"code": "C.14", "name": "CONSTRUCTION CREW", "items": ["Construction Manager(s)", "Labourer(s)"]},
            {"code": "C.17", "name": "OCCUPATIONAL HEALTH & SAFETY CREW", "items": ["Safety Report"]},
            {"code": "C.24", "name": "OVERTIME & LOADINGS", "items": ["Overtime Contingency", "Preliminary Estimate for Crew Fringes calculations", "Pty.Ltd. Company Fees", "Taxed Individuals Salaries & Wages", "Allowances not included in C above"]}
        ]
    },
    {
        "id": "D", "name": "FRINGES & WORKERS COMPENSATION",
        "groupings": [
            {"code": "D_gen", "name": "General Items", "items": ["Holiday Pay (Above Line & Crew)", "Payroll Tax (Above Line, Crew, Cast/Stunts)", "Superannuation (Above Line, Crew, Cast)", "Workers Compensation (All departments)"]}
        ]
    },
    {
        "id": "E(b)", "name": "Cast Below Line",
        "groupings": [
            {"code": "E(b)2", "name": "CAST - PRINCIPALS", "items": ["Total per Worksheet 3"]},
            {"code": "E(b)3", "name": "CAST - SUPPORTS", "items": ["Preprodn. incl Rehearsals, W/D, M/U"]},
            {"code": "E(b)4", "name": "STANDINS & DOUBLES", "items": ["Post-Sync/ADR"]},
            {"code": "E(b)6", "name": "EXTRAS", "items": ["City Extras"]}
        ]
    },
    {
        "id": "F", "name": "Costumes & Make-Up",
        "groupings": [
            {"code": "F.1", "name": "COSTUMES", "items": ["Dept. Set-up Expenses", "Principals - E(a)2 - Australian", "Supports - E(b)3"]},
            {"code": "F.2", "name": "MAKE-UP & HAIRDRESSING", "items": ["Make-up Supplies/Kit hire"]}
        ]
    },
    {
        "id": "G", "name": "Locations",
        "groupings": [
            {"code": "G.1", "name": "LOCATIONS", "items": ["Main Office location"]}
        ]
    },
    {
        "id": "H", "name": "SETS & PROPERTIES",
        "groupings": [
            {"code": "H.1", "name": "CONSTRUCTION", "items": ["Dept. Set-up Expenses"]},
            {"code": "H.2", "name": "PROPS & SET DRESSING", "items": ["Equipment - Hire", "Equipment - Purchase"]}
        ]
    },
    {
        "id": "J", "name": "DIGITAL VIDEO PRODUCTION",
        "groupings": [
            {"code": "J_gen", "name": "General Items", "items": ["On Line Conform per hr", "Colour Grading p/hr", "Mastering p/hr", "Master Stock", "Delivery Masters (Export, DVD Copies, etc.)", "Data Storage"]}
        ]
    },
    {
        "id": "K", "name": "EQUIPMENT & STORES",
        "groupings": [
            {"code": "K.1", "name": "CAMERA EQUIPMENT & STORES", "items": ["Camera/Access. Main Camera Package", "Expendables"]},
            {"code": "K.2", "name": "SOUND EQUIPMENT & STORES", "items": ["Sound Equipment - Main Package", "Sound Expendables"]},
            {"code": "K.3", "name": "LIGHTING EQUIPMENT & STORES", "items": ["Truck & Equipment - Main Package", "Expendables"]},
            {"code": "K.4", "name": "GRIPS EQUIPMENT & STORES", "items": ["Truck & Equipment - Main Package"]},
            {"code": "K.5", "name": "UNIT FACILITIES & STORES", "items": ["Unit Expenses", "Walkie Talkies"]},
            {"code": "K.6", "name": "SAFETY EQUIPMENT & STORES", "items": ["First Aid Supplies"]}
        ]
    },
    {
        "id": "L", "name": "RENTALS & STORAGE",
        "groupings": [
             {"code": "L_gen", "name": "General Items", "items": ["Office Rent - Base"]}
        ]
    },
    {
        "id": "M", "name": "TRAVEL & TRANSPORT",
        "groupings": [
            {"code": "M_gen", "name": "General Items", "items": ["Crew & Cast Travel", "Vehicles (Hire, Allowances)", "Petrol/Oil/Diesel", "Taxis & Parking"]}
        ]
    },
    {
        "id": "N", "name": "ACCOMMODATION, LIVING, CATERING",
        "groupings": [
            {"code": "N_gen", "name": "General Items", "items": ["Accommodation (International, Cast)", "Catering (Main Unit Crew, Cast & Stunts)"]}
        ]
    },
    {
        "id": "O", "name": "INSURANCES",
        "groupings": [
            {"code": "O_gen", "name": "General Items", "items": ["Package Premiums"]}
        ]
    },
    {
        "id": "P", "name": "OFFICE EXPENSES",
        "groupings": [
            {"code": "P_gen", "name": "General Items", "items": ["Computer Hire/Software", "Printing & Stationery", "Postage & Telephone", "Cleaning, Rubbish Removal"]}
        ]
    },
    {
        "id": "R", "name": "POST-PRODUCTION CREW",
        "groupings": [
            {"code": "R_gen", "name": "General Items", "items": ["Editor (fulltime)", "Finishing fees", "Overtime & Fringes (Holiday Pay, Payroll Tax, Super, WorkCover)"]}
        ]
    },
    {
        "id": "S", "name": "POST-PRODN. RENTALS & OFFICE EXPENSES",
        "groupings": [
            {"code": "S_gen", "name": "General Items", "items": ["All sound post", "Offline edit suite"]}
        ]
    },
    {
        "id": "W", "name": "MUSIC",
        "groupings": [
            {"code": "W_gen", "name": "General Items", "items": ["Library Music"]}
        ]
    },
    {
        "id": "X", "name": "Publicity & Delivery",
        "groupings": [
            {"code": "X.1", "name": "PUBLICITY & STILLS - PRODUCTION & POST PRODN.", "items": ["Digital and social media marketing"]},
            {"code": "X.2", "name": "DELIVERY REQUIREMENTS", "items": ["Dubs"]}
        ]
    },
    {
        "id": "Y", "name": "LEGAL & BUSINESS",
        "groupings": [
             {"code": "Y_gen", "name": "General Items", "items": ["Bank Fees", "Legal Fees & Exps. Aust."]}
        ]
    },
    {
        "id": "Z", "name": "OVERHEADS",
        "groupings": [
            {"code": "Z_gen", "name": "General Items", "items": ["Production Company 1", "Completion Guarantee", "Contingency", "Finance & Brokerage", "Marketing", "SPAA/ASDA Production Levies"]}
        ]
    }
]

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return []

def normalize_string(s):
    return s.lower().strip()

def restructure():
    print("Loading current data...")
    current_data = load_data()
    if not current_data:
        print("No data found!")
        return

    # Backup
    shutil.copy(DATA_FILE, BACKUP_FILE)
    print(f"Backup created at {BACKUP_FILE}")

    # Index existing items by description (normalized)
    item_map = {}
    
    # Also keep a list of all items to ensure we don't lose any
    all_items = []

    for cat in current_data:
        for grp in cat.get('groupings', []):
            for item in grp.get('items', []):
                desc = normalize_string(item['description'])
                item_map[desc] = item
                all_items.append(item)

    print(f"Found {len(all_items)} existing items.")

    new_categories = []
    processed_item_ids = set()

    # Build new structure
    for schema_cat in SCHEMA:
        new_cat = {
            "id": schema_cat["id"],
            "name": schema_cat["name"],
            "groupings": [],
            "total": 0
        }
        
        for schema_grp in schema_cat["groupings"]:
            new_grp = {
                "id": f"{schema_cat['id']}_{schema_grp['code']}".replace(".", "_"),
                "code": schema_grp["code"],
                "name": schema_grp["name"],
                "items": [],
                "sub_total": 0
            }
            
            # Find items for this grouping
            for item_desc_match in schema_grp["items"]:
                norm_desc = normalize_string(item_desc_match)
                
                # 1. Exact match
                if norm_desc in item_map:
                    item = item_map[norm_desc]
                    # Update grouping ID
                    item['grouping_id'] = new_grp['id']
                    new_grp['items'].append(item)
                    processed_item_ids.add(item['id'])
                else:
                    # 2. Fuzzy match / Create placeholder if missing?
                    # Let's try to find an item that *contains* the text if exact match fails
                    found = False
                    for existing_item in all_items:
                        if existing_item['id'] in processed_item_ids: continue
                        
                        if norm_desc in normalize_string(existing_item['description']):
                            existing_item['grouping_id'] = new_grp['id']
                            new_grp['items'].append(existing_item)
                            processed_item_ids.add(existing_item['id'])
                            found = True
                            break
                    
                    if not found:
                         # 3. Create placeholder if strictly required, or skip?
                         # The user probably expects these items to exist.
                         # If they don't exist in the current data, we should create them initialized to 0.
                         print(f"Creating missing item: {item_desc_match}")
                         new_item = {
                            "id": f"new_{new_grp['id']}_{len(new_grp['items'])}",
                            "code": "",
                            "description": item_desc_match,
                            "rate": 0,
                            "unit": "week",
                            "prep_qty": 0,
                            "shoot_qty": 0,
                            "post_qty": 0,
                            "total": 0,
                            "is_labor": False, # Default
                            "apply_fringes": False,
                            "grouping_id": new_grp['id'],
                            "base_hourly_rate": 0,
                            "daily_hours": 10,
                            "days_per_week": 5,
                            "is_casual": False
                         }
                         new_grp['items'].append(new_item)

            new_cat['groupings'].append(new_grp)

        new_categories.append(new_cat)

    # Handle Leftovers
    leftovers = []
    for item in all_items:
        if item['id'] not in processed_item_ids:
            leftovers.append(item)
            
    if leftovers:
        print(f"Warning: {len(leftovers)} items were not matched to the new schema.")
        # We should probably add them to a "Misc" grouping in their respective categories if possible,
        # or a global "Uncategorized" category.
        
        # Try to place them in their original category if it exists in schema
        misc_cat_map = {c['id']: c for c in new_categories}
        
        uncategorized_cat = {
            "id": "UNCAT",
            "name": "Uncategorized Items",
            "groupings": [],
            "total": 0
        }
        
        misc_grp_map = {} # cat_id -> misc_grouping

        for item in leftovers:
            # Try to determine category from item code or previous grouping
            # This is hard because we don't have the old category ID easily available on the item itself
            # unless we infer it.
            # But we can look at the item's grouping_id from the old data.
            # It was likely something like "PRODUCTION UNIT FEES & SALARIES."
            
            # Let's just dump them in "Uncategorized" for now to avoid losing data, 
            # OR better: Add them to the last grouping of the matching category if we can guess it.
            
            found_cat = False
            for schema_cat in SCHEMA:
                # Naive check if the item description suggests a category? No.
                pass

            # Add to Uncategorized
            grp = None
            if not uncategorized_cat['groupings']:
                grp = {
                    "id": "UNCAT_GEN",
                    "code": "??",
                    "name": " recovered items",
                    "items": [],
                    "sub_total": 0
                }
                uncategorized_cat['groupings'].append(grp)
            else:
                grp = uncategorized_cat['groupings'][0]
            
            item['grouping_id'] = grp['id']
            grp['items'].append(item)
            
        if uncategorized_cat['groupings'][0]['items']:
            new_categories.append(uncategorized_cat)

    # Recalculate Totals
    grand_total = 0
    for cat in new_categories:
        cat_total = 0
        for grp in cat['groupings']:
            grp_total = 0
            for item in grp['items']:
                # Ensure totals are correct
                qty = (item.get('prep_qty', 0) or 0) + (item.get('shoot_qty', 0) or 0) + (item.get('post_qty', 0) or 0)
                rate = item.get('rate', 0) or 0
                if qty == 0 and rate > 0:
                    qty = 1 # Default assumption
                item['total'] = rate * qty
                grp_total += item['total']
            
            grp['sub_total'] = grp_total
            cat_total += grp_total
        cat['total'] = cat_total
        grand_total += cat_total

    print(f"Reorganization complete. Grand Total: {grand_total}")
    
    with open(DATA_FILE, 'w') as f:
        json.dump(new_categories, f, indent=4)
        
if __name__ == "__main__":
    restructure()
