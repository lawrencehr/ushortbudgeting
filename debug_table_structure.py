import pdfplumber
import re

def inspect_table_structure():
    with pdfplumber.open("payguidepdf_G00912929.pdf") as pdf:
        # Television broadcasting starts page 2
        # Let's inspect page 2 (TV) and 37 (Artists)
        for i in [1, 36]: 
            page = pdf.pages[i]
            text = page.extract_text()
            print(f"--- PAGE {i+1} TEXT SNIPPET ---")
            print(text[:200])
            
            tables = page.extract_tables()
            print(f"--- PAGE {i+1} TABLES ---")
            for j, table in enumerate(tables):
                # Check if it looks like Table 1
                # We can't easily associate text with table index here without the logic, 
                # but usually Table 1 is first if it exists.
                if table:
                    print(f"Table {j+1} Row 0 (Header): {table[0] if len(table) > 0 else 'EMPTY'}")
                    print(f"Table {j+1} Row 1: {table[1] if len(table) > 1 else 'EMPTY'}")
                    print(f"Table {j+1} Row 2: {table[2] if len(table) > 2 else 'EMPTY'}")
                    print("-" * 20)

inspect_table_structure()
