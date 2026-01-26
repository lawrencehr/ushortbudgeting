
import openpyxl
import re

file_path = "ShortKings_Standard Series Mockup Budget.xls.xlsx"

def inspect_links():
    wb = openpyxl.load_workbook(file_path, data_only=False)
    ws = wb['Budget']
    
    print("Searching for links to '3.Cast' in 'Budget' sheet...")
    
    for row in ws.iter_rows(min_row=1, max_row=300):
        for cell in row:
            if cell.value and isinstance(cell.value, str) and "3.Cast" in cell.value:
                print(f"Cell {cell.coordinate}: {cell.value}")

if __name__ == "__main__":
    inspect_links()
