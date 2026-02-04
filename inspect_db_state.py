import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect("backend/shortkings.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("--- PROJECTS ---")
    projects = cursor.execute("SELECT * FROM project").fetchall()
    for p in projects:
        print(dict(p))
        
    print("\n--- PROJECT PHASES ---")
    phases = cursor.execute("SELECT * FROM projectphase").fetchall()
    for ph in phases:
        print(dict(ph))
        
    print("\n--- LINE ITEMS (C.4) ---")
    items = cursor.execute("SELECT * FROM lineitem WHERE description LIKE '%Camera Operator%'").fetchall()
    for item in items:
        # Avoid printing massive strings if they exist, but let's see IDs
        d = dict(item)
        if d.get('breakdown'): d['breakdown'] = 'TRUNCATED'
        if d.get('phase_details'): d['phase_details'] = json.loads(d['phase_details'])
        print(d)

    conn.close()

if __name__ == "__main__":
    inspect_db()
