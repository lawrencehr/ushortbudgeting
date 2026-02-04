import pdfplumber

with pdfplumber.open("payguidepdf_G00912929.pdf") as pdf:
    # Check what's after Artists (starts p36)
    # Check p45, 50
    for i in [36, 40, 45, 50]:
        if i < len(pdf.pages):
            text = pdf.pages[i].extract_text()
            print(f"--- PAGE {i+1} START ---")
            print(text[:300]) # First 300 chars
            print(f"--- PAGE {i+1} END ---")
