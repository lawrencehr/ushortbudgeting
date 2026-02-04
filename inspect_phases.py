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

    conn.close()

if __name__ == "__main__":
    inspect_db()
