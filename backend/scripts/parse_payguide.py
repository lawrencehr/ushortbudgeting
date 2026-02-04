from typing import List, Dict, Optional
import pdfplumber
import re
import json
import logging
import random
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ParsedTable:
    page_num: int
    table_index: int # 1-based index (e.g. 1 of 4)
    data: List[List[str]]

class PayGuideParser:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        
    def extract(self) -> Dict:
        """Main extraction method"""
        sections_data = [] # List of {name, classifications}
        
        # Helper to get or create section
        def get_section(name):
            for s in sections_data:
                if s["name"] == name: return s
            new_s = {"name": name, "classifications": []}
            sections_data.append(new_s)
            return new_s

        with pdfplumber.open(self.pdf_path) as pdf:
            # STRICT PAGE RANGES BASED ON MAPPING
            # TV (Full-time): Page 2 -> 19 (inclusive). Ends before "Directors" (Pg 20).
            # Artists (Full-time): Page 36 -> 37 (inclusive). ONLY Table 1 (Base Rates). Excludes Table 2+ (Penalties) starting Pg 38.
            # Artists (Casual): Page 79 ONLY. 
            
            for page_num, page in enumerate(pdf.pages):
                p_idx = page_num + 1 # 1-based index
                
                is_tv_page = (2 <= p_idx <= 19)
                is_artist_page = (36 <= p_idx <= 37)
                is_artist_casual_page = (p_idx == 79)
                
                if not (is_tv_page or is_artist_page or is_artist_casual_page):
                    continue
                    
                if is_tv_page:
                    section_name = "Television broadcasting"
                elif is_artist_page:
                    section_name = "Artists"
                else:
                    section_name = "Artists - Casual"
                
                text = page.extract_text()
                if not text: continue
                
                # Double check boundaries
                if is_tv_page and "Cinema - Full-time" in text: continue
                if is_artist_page and "Television broadcasting - Casual" in text: continue
                
                # Extract Table 1 Only
                tables = self._extract_table_1_only(page, page_num)
                
                # Process and Append
                if tables:
                    processed = self._process_section(section_name, tables)
                    target_sec = get_section(section_name)
                    target_sec["classifications"].extend(processed["classifications"])
                    logger.info(f"Processed Page {p_idx} for {section_name}: {len(processed['classifications'])} rows")

        return {"sections": sections_data}

    def _extract_table_1_only(self, page, page_num) -> List[ParsedTable]:
        """Extract FIRST table on page (assuming it is the main classification table)"""
        extracted_tables = page.extract_tables()
        if not extracted_tables: 
            return []
        
        # On these pages, the first table is ALMOST ALWAYS the main rate table.
        return [ParsedTable(
            page_num=page_num,
            table_index=1,
            data=extracted_tables[0]
        )]

    def _clean_cell(self, cell):
        if not cell: return ""
        return re.sub(r'\s+', ' ', cell).strip()

    def _process_section(self, section_name: str, tables: List[ParsedTable]) -> Dict:
        """Process rows for this page"""
        final_classifications = []
        
        # Merge all Table 1 rows (usually just 1 table per page)
        all_rows = []
        for t in tables:
            all_rows.extend(t.data)
            
        # Determine Rate Column
        # Full-time tables have Weekly (1) and Hourly (2)
        # Casual tables usually skip Weekly, so Hourly is (1)
        CLS_IDX = 0
        if "Casual" in section_name:
            RATE_IDX = 1
        else:
            RATE_IDX = 2
        
        for i, row in enumerate(all_rows):
            if not row or len(row) <= RATE_IDX: 
                continue
                
            raw_cls = row[CLS_IDX]
            raw_rate = row[RATE_IDX]
            
            cls_name = self._clean_cell(raw_cls)
            if not cls_name: continue
            
            # Filter Headers
            if "Classification" in cls_name or "Hourly pay" in cls_name:
                continue
            
            rate_val = self._parse_rate(raw_rate)
            if rate_val <= 0: continue
            
            final_classifications.append({
                "classification": cls_name,
                "hourly_rate": rate_val,
                "_meta_source": f"Page {tables[0].page_num} Row {i}"
            })

        return {
            "name": section_name, 
            "classifications": final_classifications
        }

    def _parse_rate(self, rate_str: str) -> float:
        try:
            if not rate_str: return 0.0
            clean = re.sub(r'[$,\s]', '', rate_str)
            return float(clean)
        except:
            return 0.0

if __name__ == "__main__":
    parser = PayGuideParser("payguidepdf_G00912929.pdf")
    data = parser.extract()
    
    # Verification
    print("\n--- SUMMARY ---")
    for s in data['sections']:
        print(f"Section: {s['name']} - {len(s['classifications'])} rows")
        # Check start/end
        if s['classifications']:
            print(f"  Start: {s['classifications'][0]['classification']}")
            print(f"  End:   {s['classifications'][-1]['classification']}")
            
            # Check for specific items
            if s['name'] == "Television broadcasting":
                captioning = [c for c in s['classifications'] if "Captioning" in c['classification']]
                print(f"  Captioning Entries: {len(captioning)}")
                if captioning: print(f"  Sample Captioning: {captioning[0]}")
                
            if s['name'] == "Artists":
                performer = [c for c in s['classifications'] if "Performer Class" in c['classification']]
                print(f"  Performer Entries: {len(performer)}")
    
    print("\n--- RANDOM SAMPLES ---")
    all_cls = []
    for s in data['sections']:
        for c in s['classifications']:
            all_cls.append(f"[{s['name']}] {c['classification']} : ${c['hourly_rate']}")
            
    if all_cls:
        for _ in range(3):
            print(random.choice(all_cls))

    with open("backend/data/award_rates.json", 'w') as f:
        json.dump(data, f, indent=2)
