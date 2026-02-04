import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect("backend/shortkings.db")
    cursor = conn.cursor()
    
    # Find Camera Operator
    cursor.execute("SELECT id, description, phase_details, breakdown, total FROM lineitem WHERE description LIKE '%Camera Operator%'")
    rows = cursor.fetchall()
    
    for row in rows:
        lid, desc, details, breakdown, total = row
        print(f"\nItem: {desc} (ID: {lid})")
        print(f"Total in DB: {total}")
        
        if details:
            print("Phase Details (Config):")
            print(json.dumps(json.loads(details), indent=2))
            
        if breakdown:
            print("\nBreakdown (Calculated Results):")
            bd = json.loads(breakdown)
            for phase, pdata in bd.items():
                print(f"  Phase: {phase} - Total: {pdata['cost']}")
                for day in pdata.get('details', []):
                    print(f"    - {day['date']} ({day['day_type']}): ${day['total_day_cost']}")

    conn.close()

if __name__ == "__main__":
    inspect_db()
