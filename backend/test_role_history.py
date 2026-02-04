
import requests
import json
import uuid
import time

API_URL = "http://127.0.0.1:8000/api"

def test_role_history_auto_learn():
    print("Starting RoleHistory Auto-Learn Test...")
    
    # 1. Create a unique role name
    role_name = f"Test Role {uuid.uuid4().hex[:8]}"
    print(f"Testing with Role Name: {role_name}")
    
    # 2. Add an item with this role to the budget
    # Need a valid grouping ID first.
    try:
        res = requests.get(f"{API_URL}/budget")
        budget = res.json()
        if not budget:
            print("No budget found.")
            return
            
        target_cat = budget[0]
        target_grp = target_cat['groupings'][0]
        grp_id = target_grp['id']
        
        item_data = {
            "id": str(uuid.uuid4()),
            "description": role_name, # This triggers the learning
            "rate": 500,
            "quantity": 1,
            "total": 500,
            "is_labor": True,
            "base_hourly_rate": 50,
            "daily_hours": 10,
            "days_per_week": 5,
            "grouping_id": grp_id
        }
        
        target_grp['items'].append(item_data)
        
        # 3. Save Budget to trigger learning
        print("Saving Budget to trigger learning...")
        save_res = requests.post(f"{API_URL}/budget", json=budget)
        if save_res.status_code != 200:
            print(f"Save Failed: {save_res.text}")
            return
            
        # 4. Search for the role
        print("Searching for the role...")
        # Short delay for DB commit if async (though it's sync here)
        time.sleep(1)
        
        search_res = requests.get(f"{API_URL}/roles/search?q={role_name}")
        results = search_res.json()
        
        print(f"Search Results: {json.dumps(results, indent=2)}")
        
        found = any(r['role_name'] == role_name for r in results)
        
        if found:
            print("SUCCESS: Role correctly learned and returned in search.")
            
            # Verify fields
            role = next(r for r in results if r['role_name'] == role_name)
            if role['base_rate'] == 50:
                print("SUCCESS: Base Rate correctly stored.")
            else:
                print(f"FAILURE: Base Rate mismatch. Expected 50, got {role['base_rate']}")
        else:
            print("FAILURE: Role not found in search results.")
            
    except Exception as e:
        print(f"Test Exception: {e}")

if __name__ == "__main__":
    test_role_history_auto_learn()
