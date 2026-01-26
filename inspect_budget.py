import pandas as pd
import openpyxl
import os

file_path = r"C:\Users\Lawrence\Documents\Gemini Sandbox\ShortKings_Standard Series Mockup Budget.xls.xlsx"

try:
    print(f"Analyzing 'Budget' sheet of: {file_path}")
    
    # Read 'Budget' sheet
    df = pd.read_excel(file_path, sheet_name='Budget', header=None, engine='openpyxl') 
    
    print("\n--- First 30 rows of 'Budget' sheet ---")
    print(df.head(30).to_string())
    
except Exception as e:
    print(f"Error reading file: {e}")
