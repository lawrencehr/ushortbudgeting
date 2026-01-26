import pypdf
import re
import json
import logging
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field
from thefuzz import fuzz

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

@dataclass
class ColumnDefinition:
    key: str
    patterns: List[str]
    priority: int = 10

class HeaderMapper:
    """Dynamically maps header text to standardized keys."""
    
    @staticmethod
    def map_columns(header_text: str, value_count: int) -> List[str]:
        # Normalize
        text = header_text.lower()
        cols = []
        
        # 1. Broadcaster Award Table 1 (Base Rates)
        if "weekly" in text and "hourly" in text and "monday" in text and value_count >= 7:
            cols = ["weekly_rate", "hourly_rate", "penalty_saturday", "penalty_sunday", "penalty_public_holiday", "ot_mon_fri_first_2h", "ot_mon_fri_after_2h"]
            if "casual" in text:
                cols = ["casual_hourly"] + cols[2:]
        
        # 2. Table 2 (Weekend OT & Breaks)
        elif "saturday" in text and "sunday" in text and "overtime" in text and value_count >= 4:
            cols = ["ot_sat_first_2h", "ot_sat_after_2h", "ot_sunday", "ot_public_holiday"]
            if value_count >= 5: cols.append("recall_allowance")
            if value_count >= 6: cols.append("break_penalty")
            
        # 3. Shift Allowances (Essential for Tiered Rates)
        elif "night" in text or "shift" in text or ("15%" in text and "30%" in text):
             cols = ["shift_early_morning", "shift_night_15", "shift_night_30", "shift_permanent_night", "shift_sat", "shift_sun"]

        # 4. Meal Break Penalties (New from analysis)
        elif "delayed" in text or "meal break" in text:
            # Common pattern: M-F, Sat/Sun, PubHol
            cols = ["penalty_meal_break_mon_fri", "penalty_meal_break_weekend", "penalty_meal_break_pubhol"]
            
        # 5. Public Holiday Specials (New)
        elif "working through a meal break" in text:
            # Complex table, huge cols. Map generically for now to avoid "unknown" pollution
            cols = [f"allowance_meal_break_{i}" for i in range(value_count)]
            
        # Fill remaining gaps
        if len(cols) < value_count:
            # DEBUG: Log this mystery table
            with open("debug_headers_v2.txt", "a") as dbg:
                dbg.write(f"UNMAPPED: Cols={value_count} Header='{text}'\n")
            
            for i in range(len(cols), value_count):
                cols.append(f"unknown_col_{i+1}")
        
        if len(cols) > value_count:
             cols = cols[:value_count]
             
        return cols

@dataclass
class TableFragment:
    table_idx: int 
    total_tables: int
    raw_header: str
    column_keys: List[str]
    rows: List[Tuple[str, List[float]]] 

@dataclass
class PayGuideSection:
    name: str
    fragments: List[TableFragment] = field(default_factory=list)

class PayGuideParserV3:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.sections: List[PayGuideSection] = []
        
        self.regex = {
            'table_meta': re.compile(r'^Table\s+(\d+)\s+of\s+(\d+)', re.IGNORECASE),
            'currency': re.compile(r'^\$?([\d,]+\.?\d*)$'),
            'ignore': [
                re.compile(r'^Award Code:.*'), 
                re.compile(r'^Page\s+\d+'), 
                re.compile(r'^\d+$')
            ]
        }

    def normalize_text(self, text: str) -> str:
        text = text.encode('ascii', 'ignore').decode('ascii')
        return re.sub(r'\s+', ' ', text).strip()

    def parse_values(self, line: str) -> Tuple[Optional[str], List[str]]:
        parts = line.split()
        values = []
        idx = len(parts) - 1
        while idx >= 0:
            token = parts[idx]
            clean = re.sub(r'[$,%]', '', token)
            try:
                float(clean)
                values.insert(0, token)
                idx -= 1
            except ValueError:
                if token.upper() == "N/A":
                    values.insert(0, token)
                    idx -= 1
                else:
                    break
        classification = " ".join(parts[:idx+1])
        return classification, values

    def parse(self):
        reader = pypdf.PdfReader(self.pdf_path)
        buffer_header = []
        buffer_rows = []
        buffer_classification = []
        
        current_table_meta = None 
        in_header_mode = False
        
        # Determine "Global Section" based on keywords if needed
        # Assuming single implicit section for now as per v2 logic
        
        for page in reader.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if not line: continue
                if any(p.match(line) for p in self.regex['ignore']): continue
                
                tm = self.regex['table_meta'].match(line)
                if tm:
                    if current_table_meta:
                        self._save_fragment(current_table_meta, buffer_header, buffer_rows)
                    
                    current_table_meta = (int(tm.group(1)), int(tm.group(2)))
                    buffer_header = []
                    buffer_rows = []
                    buffer_classification = []
                    in_header_mode = True
                    continue
                
                if in_header_mode:
                    cls, vals = self.parse_values(line)
                    if vals:
                        in_header_mode = False
                        self._process_data_row(cls, vals, buffer_classification, buffer_rows)
                        buffer_classification = [] 
                    else:
                        buffer_header.append(line)
                else:
                    cls, vals = self.parse_values(line)
                    if vals:
                        self._process_data_row(cls, vals, buffer_classification, buffer_rows)
                        buffer_classification = []
                    else:
                        if len(line) > 5 and not any(char.isdigit() for char in line):
                             buffer_classification.append(line)

        if current_table_meta:
            self._save_fragment(current_table_meta, buffer_header, buffer_rows)
            
    def _process_data_row(self, line_cls, line_vals, cls_buffer, row_buffer):
        full_cls_parts = cls_buffer + ([line_cls] if line_cls else [])
        full_cls = " ".join(full_cls_parts).strip()
        
        clean_vals = []
        for v in line_vals:
            if v == "N/A": 
                clean_vals.append(None)
                continue
            clean = re.sub(r'[$,%]', '', v)
            try:
                clean_vals.append(float(clean))
            except:
                clean_vals.append(0.0)
                
        row_buffer.append((full_cls, clean_vals))

    def _save_fragment(self, meta, header_lines, rows):
        idx, total = meta
        raw_header = " ".join(header_lines)
        if not self.sections:
            self.sections.append(PayGuideSection("Main"))
        
        if not rows: return
        sample_val_count = len(rows[0][1])
        keys = HeaderMapper.map_columns(raw_header, sample_val_count)
        
        frag = TableFragment(idx, total, raw_header, keys, rows)
        self.sections[0].fragments.append(frag)
        
    def to_json(self, path: str):
        merged_data = self._merge_fragments()
        with open(path, 'w') as f:
            json.dump({"classifications": merged_data}, f, indent=2)

    def _merge_fragments(self) -> List[Dict]:
        if not self.sections: return []
        
        frags = self.sections[0].fragments
        # Group frag sequences: T1 of 4, T2 of 4...
        sets = []
        current_set = []
        for f in frags:
            if f.table_idx == 1:
                if current_set: sets.append(current_set)
                current_set = [f]
            else:
                current_set.append(f)
        if current_set: sets.append(current_set)
        
        # Merge Strategy:
        # 1. Start with Base Table (Table 1)
        # 2. Use Fuzzy Matching to link rows from Table 2, 3, etc. to Base Table rows
        
        # Flatten all sets into one large pool of "Base" classifications if they are distinct?
        # A set usually represents ONE group of classifications (e.g. "Broadcasting").
        
        all_merged_entries = []
        
        for table_set in sets:
            # Base Table is index 0
            base_frag = table_set[0]
            
            # Init base entries
            local_entries = []
            for cls, vals in base_frag.rows:
                entry = {"classification": cls}
                for k, v in zip(base_frag.column_keys, vals):
                    entry[k] = v
                local_entries.append(entry)
                
            # Now merge subsequent tables
            for sub_frag in table_set[1:]:
                # Try to find matching classification in local_entries
                for sub_cls, sub_vals in sub_frag.rows:
                    
                    # Match Strategy:
                    # 1. Exact Match
                    # 2. Fuzzy Match
                    
                    best_match = None
                    best_score = 0
                    
                    for entry in local_entries:
                        # Simple exact check first
                        if entry["classification"] == sub_cls:
                            best_match = entry
                            best_score = 100
                            break
                        
                        # Fuzzy
                        score = fuzz.ratio(entry["classification"].lower(), sub_cls.lower())
                        if score > 85 and score > best_score:
                            best_match = entry
                            best_score = score
                            
                    if best_match:
                        # Merge data
                        for k, v in zip(sub_frag.column_keys, sub_vals):
                            # Don't overwrite if unknown? Or append?
                            # Standard update
                            best_match[k] = v
                            # Tag source for debug?
                            # best_match[f"_source_{k}"] = f"Table{sub_frag.table_idx}"
                    else:
                        logging.warning(f"Orphan row in Table {sub_frag.table_idx}: '{sub_cls}' (No match in Table 1)")
            
            all_merged_entries.extend(local_entries)
            
        return all_merged_entries

if __name__ == "__main__":
    parser = PayGuideParserV3("payguidepdf_G00912929.pdf")
    parser.parse()
    parser.to_json("pay_rates_v3.json")
