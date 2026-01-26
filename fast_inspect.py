import pandas as pd
import sys

file_path = "ShortKings_Standard Series Mockup Budget.xls.xlsx"

try:
    print(f"Opening {file_path}...")
    xls = pd.ExcelFile(file_path, engine='openpyxl')
    print("Sheet names found:")
    for sheet in xls.sheet_names:
        print(f"- {sheet}")
except Exception as e:
    print(f"Error: {e}")
