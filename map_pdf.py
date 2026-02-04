import pdfplumber
import re

def map_pdf():
    keywords = ["Television broadcasting", "Artists", "Motion Picture", "Cinema", "Captioning", "Performer Class 2", "Level 1", "Stand-In"]
    
    print("Mapping PDF Sections and Keywords (Pages 1-60)...")
    
    with pdfplumber.open("payguidepdf_G00912929.pdf") as pdf:
        for i, page in enumerate(pdf.pages):
            if i > 60: break # Optimization
            
            text = page.extract_text()
            if not text: continue
            
            # 1. Detect Headers (Naively by checking first few lines)
            lines = text.split('\n')
            header_candidate = lines[0] if lines else ""
            if len(lines) > 1 and "Rates of pay" in lines[0]:
                header_candidate = lines[2] if len(lines) > 2 else lines[1]
                
            # 2. Search Keywords
            found = []
            for k in keywords:
                if k in text:
                    found.append(k)
            
            if found or i in [1, 35, 36, 50]: # Print interesting pages
                print(f"--- PAGE {i+1} ---")
                print(f"Header Est: {header_candidate[:50]}...")
                print(f"Keywords Found: {found}")
                
map_pdf()
