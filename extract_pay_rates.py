import pypdf
import re
import json

def extract_pay_rates(pdf_path, output_json_path):
    reader = pypdf.PdfReader(pdf_path)
    all_data = []
    
    current_section = "Unknown Section"
    current_table = "Unknown Table"
    
    # Regex to match a line that ends with a sequence of values ($X.XX or N/A or percentages)
    # matching $1,234.56 or 12.34% or N/A
    # We'll be a bit loose: look for at least two values at the end of the line, 
    # or one value if it's a specific simple table.
    # Most tables have multiple columns.
    
    # Pattern for a value: (\$[\d,]+\.\d{2}|N/A|[\d\.]+%)
    value_pattern = r'(?:\$[\d,]+\.\d{2}|N/A|[\d\.]+%)'
    # Pattern for the end of the line containing values
    # We expect the line to end with a value, and have some values preceding it separated by whitespace.
    # We captures the classification (start of line) and the values string (end of line)
    row_pattern = re.compile(r'^(?P<class>.*?)\s*(?P<values>(?:' + value_pattern + r'\s*)+)$')

    # Regex to detect Table headers
    table_start_pattern = re.compile(r'^Table\s+\d+\s+of\s+\d+', re.IGNORECASE)
    
    # Header keywords to ignore/clear buffer
    header_keywords = [
        "Weekly", "Hourly", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
        "Overtime", "Public holiday", "Rate", "pay", "hours", "shift", "break", "meal", "call", "allowance",
        "Classification", "Rate", "Rates", "Working on", "accrued", "unrostered", "day off",
        "day (public holiday)", "working on an", "other than", "advertising", "notice", "films",
        "per occasion", "holiday", "records for sale", "feature films", "television broadcasting"
    ]

    # Buffer for multi-line classifications
    classification_buffer = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for Table Start
            if table_start_pattern.match(line):
                current_table = line
                classification_buffer = [] # Clear buffer on new table
                continue

            # Check for specific known section headers or heuristically detect them
            
            match = row_pattern.match(line)
            if match:
                # It's a data row
                classification_part = match.group('class').strip()
                values_str = match.group('values').strip()
                
                # Split values
                values = re.findall(value_pattern, values_str)
                
                # If we have a buffer, prepend it
                if classification_buffer:
                    full_classification = " ".join(classification_buffer) + " " + classification_part
                    classification_buffer = []
                else:
                    full_classification = classification_part
                
                # Strip leading header junk that might have leaked into the classification
                # Repeat until no more keywords match the start
                changed = True
                while changed:
                    changed = False
                    for kw in header_keywords:
                        if full_classification.lower().startswith(kw.lower()):
                            full_classification = full_classification[len(kw):].strip()
                            changed = True
                            break
                    
                    # Also strip common punctuation spillover
                    if full_classification.startswith("-") or full_classification.startswith(":") or full_classification.startswith("("):
                        full_classification = full_classification[1:].strip()
                        changed = True

                # Final check: if it starts with "day (" or similar
                if full_classification.lower().startswith("day ("):
                    full_classification = re.sub(r'^day\s*\([^)]*\)\s*', '', full_classification, flags=re.IGNORECASE).strip()

                # Deduplicate name if it repeats (e.g. "Leader Leader")
                words = full_classification.split()
                if len(words) > 1 and words[0] == words[1]:
                    full_classification = " ".join(words[1:])

                # Store the row
                if full_classification: # Don't store if we cleaned everything away
                    all_data.append({
                        "page": page_num + 1,
                        "section_hint": current_section, 
                        "table": current_table,
                        "classification": full_classification,
                        "rates": values,
                        "raw_line": line
                    })
            else:
                # Not a row.
                
                # Identify section
                if "broadcasting" in line or "Journalists" in line or "Cinema" in line or "Motion picture" in line or "Musicians" in line or "Artists" in line:
                     if len(line) < 100 and not any(char.isdigit() for char in line):
                         current_section = line
                         classification_buffer = [] # Clear buffer on new section
                         continue
                
                # Identify if it's a header line to ignore/clear buffer
                is_header = False
                if any(x.lower() in line.lower() for x in header_keywords):
                    is_header = True
                
                if line.startswith("-") or line.startswith("(") or line.endswith(":") or len(line) < 3:
                    is_header = True

                if is_header:
                    classification_buffer = [] # Clear buffer, it was likely headers
                else:
                    # Append to buffer if it's not structural info
                    if "Table" not in line and "Page" not in line and "Award" not in line and "Effective:" not in line:
                         classification_buffer.append(line)

    with open(output_json_path, 'w') as f:
        json.dump(all_data, f, indent=2)
    
    print(f"Extracted {len(all_data)} rows. Saved to {output_json_path}")

if __name__ == "__main__":
    extract_pay_rates("payguidepdf_G00912929.pdf", "raw_rates.json")