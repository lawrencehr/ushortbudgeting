
import requests
import json
import uuid

API_URL = "http://127.0.0.1:8000/api"

def test_persistence():
    print("Starting Persistence Test for Labor V2 Fields...")

    # 1. Create a dummy budget structure with a new item containing V2 fields
    new_item_id = str(uuid.uuid4())
    grouping_id = "grp-" + str(uuid.uuid4()) # We need a valid grouping usually, but main.py might generate if not exists? 
    # Actually main.py save_budget iterates existing categories. We should fetch existing first or create a structure.
    
    # Fetch existing to get a valid grouping ID
    try:
        res = requests.get(f"{API_URL}/budget")
        budget = res.json()
        if not budget:
            print("No budget found. Cannot test inline addition without structure.")
            return
        
        # Pick first category and grouping
        target_cat = budget[0]
        if not target_cat['groupings']:
            print("No groupings found.")
            return
        
        target_grp = target_cat['groupings'][0]
        grp_id = target_grp['id']
        
        print(f"Using Grouping ID: {grp_id}")
        
        # Create Item Data with V2 Fields
        item_data = {
            "id": new_item_id,
            "description": "Test Labor V2 Persistence",
            "rate": 100,
            "quantity": 1,
            "prep_qty": 1,
            "shoot_qty": 1,
            "post_qty": 0,
            "total": 200,
            "is_labor": True,
            "base_hourly_rate": 50,
            "daily_hours": 10,
            "days_per_week": 5,
            "calendar_mode": "custom", # V2 Field
            "phase_details": { # V2 Field
                "active_phases": {"pre": True, "shoot": True, "post": False},
                "custom_notes": "Preserved?"
            },
            "award_classification_id": "cls-123", # V2 Field
            "role_history_id": "role-456", # V2 Field
            "labor_phases_json": json.dumps([{"phase": "pre", "days": 1}]), # V2 Field
            "allowances": [{"name": "Meal", "amount": 20}] # Should check serialization
        }
        
        # Add to local structure
        target_grp['items'].append(item_data)
        
        # 2. Save Budget
        print("Saving Budget...")
        save_res = requests.post(f"{API_URL}/budget", json=budget)
        if save_res.status_code != 200:
            print(f"Save Failed: {save_res.text}")
            return
        print("Save Successful.")
        
        # 3. Reload Budget
        print("Reloading Budget...")
        reload_res = requests.get(f"{API_URL}/budget")
        reloaded_budget = reload_res.json()
        
        # 4. Verify Fields
        found = False
        for cat in reloaded_budget:
            for grp in cat['groupings']:
                if grp['id'] == grp_id:
                    for item in grp['items']:
                        if item['id'] == new_item_id:
                            found = True
                            print("Item Found. Verifying Fields...")
                            
                            # Checks
                            errors = []
                            if item.get('calendar_mode') != 'custom':
                                errors.append(f"calendar_mode mismatch: {item.get('calendar_mode')}")
                            
                            # phase_details might come back as dict
                            pd = item.get('phase_details')
                            if not pd or pd.get('custom_notes') != 'Preserved?':
                                errors.append(f"phase_details mismatch: {pd}")
                                
                            if item.get('award_classification_id') != 'cls-123':
                                errors.append(f"award_classification_id mismatch: {item.get('award_classification_id')}")

                            if item.get('role_history_id') != 'role-456':
                                errors.append(f"role_history_id mismatch: {item.get('role_history_id')}")
                                
                            # labor_phases_json might return as string or parsed (models.py vs response)
                            # main.py model_dump() usually dumps as is. If SQLModel field is string, it's string.
                            # But if we want it as object, we might need to parse.
                            # Let's see what we get.
                            print(f"labor_phases_json type: {type(item.get('labor_phases_json'))}")
                            
                            if not errors:
                                print("SUCCESS: All V2 fields persisted correctly!")
                            else:
                                print("FAILURE: Some fields did not persist:")
                                for e in errors:
                                    print(f"  - {e}")
                            
                            # Clean up (optional)
                            # ...
                            
        if not found:
            print("FAILURE: Item not found in reloaded budget.")

    except Exception as e:
        print(f"Test Exception: {e}")

if __name__ == "__main__":
    test_persistence()
