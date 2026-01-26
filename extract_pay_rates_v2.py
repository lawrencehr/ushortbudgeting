import pypdf
import re
import json
import logging
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

@dataclass
class TableFragment:
    """Represents a single parsed table fragment (Table X of Y)."""
    table_idx: int # 1 for 'Table 1 of 4'
    total_tables: int # 4 for 'Table 1 of 4'
    headers: List[str]
    rows: List[Dict[str, Any]] # Keyed by normalized classification if possible, or just list of values

@dataclass
class PayGuideSection:
    """Represents a major section in the document (e.g. 'Television Broadcasting')."""
    name: str
    effective_date: str
    notes: List[str] = field(default_factory=list)
    table_fragments: Dict[str, List[TableFragment]] = field(default_factory=dict) # Keyed by base classification/table signature
    merged_data: List[Dict[str, Any]] = field(default_factory=list)

class PayGuideParser:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.reader = pypdf.PdfReader(pdf_path)
        self.sections: List[PayGuideSection] = []
        self.current_section: Optional[PayGuideSection] = None
        self.global_effective_date = "01/07/2025" # Default fallback

        # Regex Patterns
        self.regex = {
            'date': re.compile(r'Effective:\s*(\d{2}/\d{2}/\d{4})'),
            'table_meta': re.compile(r'^Table\s+(\d+)\s+of\s+(\d+)', re.IGNORECASE),
            'currency': re.compile(r'^\$([\d,]+\.\d{2})$|^\$([\d,]+)$'),
            'ignore': [
                re.compile(r'^Award Code:.*'), 
                re.compile(r'^Page\s+\d+'), 
                re.compile(r'^\d+$'), # Page numbers isolated
                re.compile(r'^Rates of pay'), 
                re.compile(r'^Adult')
            ]
        }

    def normalize_text(self, text: str) -> str:
        text = text.encode('ascii', 'ignore').decode('ascii')
        return re.sub(r'\s+', ' ', text).strip()

    def parse_amount(self, val: str) -> Optional[float]:
        if not val or val == "N/A": return None
        clean = re.sub(r'[$,\s\u202f]', '', val)
        if '%' in clean: clean = clean.replace('%', '')
        try:
            return float(clean)
        except ValueError:
            return None

    def extract_line_data(self, line: str) -> Tuple[Optional[str], List[str]]:
        """
        Extracts classification and value columns from a line.
        Strategy: Look for money values ($XX.XX) or percentages or numbers at the end of the line.
        """
        # Pattern for money, N/A, or specific number formats
        val_p = r'(\$[\d,]+\.\d{2}(?:\s+per\s+\w+)?|N/A|[\d\.]+%?)'
        matches = list(re.finditer(val_p, line))
        
        if not matches:
            return None, []

        # Find the split point between text and values
        # We assume values are contiguous at the end
        start_idx = -1
        for i in range(len(matches)-1, -1, -1):
            if i == len(matches) - 1:
                start_idx = i
            else:
                # Check gap between matches; if it's just whitespace, they are part of the value block
                mid = line[matches[i].end():matches[i+1].start()].strip()
                if not mid: 
                    start_idx = i
                else: 
                    # Found text between values? Anomalous, but assume strict right-alignment
                    break
        
        if start_idx == -1: return None, []
        
        classification_part = line[:matches[start_idx].start()].strip()
        values = [line[m.start():m.end()].strip() for m in matches[start_idx:]]
        
        return classification_part, values

    def finalize_current_section(self):
        if self.current_section:
            self._merge_tables(self.current_section)
            self.sections.append(self.current_section)
            self.current_section = None

    def start_new_section(self, name: str):
        self.finalize_current_section()
        self.current_section = PayGuideSection(
            name=self.normalize_text(name),
            effective_date=self.global_effective_date
        )
        logging.info(f"Started Section: {self.current_section.name}")

    def _merge_tables(self, section: PayGuideSection):
        """
        Horizontally merge Table 1..N for the section.
        Assumption: All fragments for 'Table X of Y' have matching row counts and classifications.
        """
        # Group fragments by total_tables count to handle different table sets within one section (rare but possible)
        # Actually, usually simpler: 
        # A section might have "Adult Rates" (Table 1 of 2, 2 of 2) and "Junior Rates" (Table 1 of 2...)
        # But commonly they are just sequential text blocks.
        
        # We used `table_fragments` dict. But identifying *which* fragments belong together is tricky purely by stream.
        # Simplification: We merge based on sequential appearance in the parsed list.
        pass

    def parse(self):
        logging.info(f"Parsing {self.pdf_path}...")
        
        classification_buffer = []
        header_buffer = []
        in_header = False
        
        current_table_set = [] # List of TableFragments belonging to the current 'table' logic
        
        # Temporary storage for the current table being parsed
        current_fragment_rows = [] 
        current_fragment_meta = None # (idx, total)

        for page in self.reader.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if not line: continue

                # 1. Global Metadata
                if "Effective:" in line:
                    m = self.regex['date'].search(line)
                    if m: self.global_effective_date = m.group(1)
                
                # 2. Ignore Patterns
                if any(p.match(line) for p in self.regex['ignore']): continue

                # 3. Table Headers "Table X of Y"
                tm = self.regex['table_meta'].match(line)
                if tm:
                    # New Table Text detected.
                    # If we were collecting rows for a previous fragment, save them
                    if current_fragment_meta:
                         self._save_fragment(current_fragment_meta, current_fragment_rows, header_buffer)
                    
                    # Reset for new table
                    current_fragment_meta = (int(tm.group(1)), int(tm.group(2)))
                    current_fragment_rows = []
                    header_buffer = []
                    classification_buffer = []
                    in_header = True
                    continue
                
                # 4. Check for Section Headers
                # Heuristic: Uppercase-ish, no numbers (mostly), long text, specific keywords
                is_section = False
                if not in_header and len(line) < 80 and not self.regex['currency'].search(line):
                     clean = line.lower()
                     if ("broadcasting" in clean or "artists" in clean or "technicians" in clean) and "table" not in clean:
                         # Likely a section
                         cls, vals = self.extract_line_data(line)
                         if not vals:
                             self.start_new_section(line)
                             is_section = True
                             classification_buffer = []

                if is_section: continue

                # 5. Data Extraction
                cls_part, raw_values = self.extract_line_data(line)
                
                if raw_values:
                    # It's a data row
                    in_header = False
                    if cls_part: 
                        # Filter out garbage classifications that are actually headers
                        if cls_part.strip().lower() in ["level", "classification", "grade"]:
                            continue
                        classification_buffer.append(cls_part)
                    
                    full_cls = self.normalize_text(" ".join(classification_buffer))
                    
                    # Double check if finalized class is garbage
                    if not full_cls or full_cls.lower() in ["level", "classification", "grade"]:
                         classification_buffer = []
                         continue
                         
                    current_fragment_rows.append({
                        "classification": full_cls,
                        "values": raw_values
                    })
                    classification_buffer = []
                else:
                    # It's header or wrapped classification text
                    if in_header:
                        header_buffer.append(line)
                    else:
                        classification_buffer.append(line)

        # End of loop
        if current_fragment_meta:
            self._save_fragment(current_fragment_meta, current_fragment_rows, header_buffer)
        
        self.finalize_current_section()
        self._post_process()

    def _save_fragment(self, meta, rows, header_lines):
        if not self.current_section: 
            # Should identify a default section?
            return
            
        t_idx, t_total = meta
        # Join header lines
        header_text = " ".join(header_lines)
        
        # Determine column names based on heuristic or order?
        # Ideally, we'd parse the header text to allow 'Weekly', 'Hourly', etc.
        # For now, let's store raw.
        
        fragment = TableFragment(
            table_idx=t_idx,
            total_tables=t_total,
            headers=[header_text], # Simplification
            rows=rows
        )
        
        # Store in the current section
        # We need to know which 'set' this belongs to. 
        # Identify via classification signature? or just append to a list and sort out later?
        # We'll use a specific key for 'pending_fragments' in the section
        if "pending" not in self.current_section.table_fragments:
             self.current_section.table_fragments["pending"] = []
        self.current_section.table_fragments["pending"].append(fragment)

    def _post_process(self):
        """
        Go through each section and merge pending fragments.
        Logic: Iterate fragments. 
        If Fragment is Table 1 of X: Start new merge group.
        If Fragment is Table N of X: Merge into current group.
        """
        for section in self.sections:
            if "pending" not in section.table_fragments: continue
            
            fragments = section.table_fragments["pending"]
            merged_rows = []
            
            # We assume fragments are in order of reading: Table 1, Table 2, Table 3...
            # But sometimes Section A Table 1, Section B Table 1... (handled by section switching)
            # Sometimes Table 1 of 2, Table 2 of 2, Table 1 of 4, Table 2 of 4... (Multiple tables in one section)
            
            current_merge_set = []
            
            for frag in fragments:
                if frag.table_idx == 1:
                    # Process previous set if exists
                    if current_merge_set:
                        self._merge_and_add(section, current_merge_set)
                    current_merge_set = [frag]
                else:
                    if not current_merge_set:
                        logging.warning(f"Found Table {frag.table_idx} without Table 1 in section {section.name}")
                        continue
                    # Check if compatible (same total count context)
                    if frag.table_idx == current_merge_set[-1].table_idx + 1:
                        current_merge_set.append(frag)
                    else:
                        logging.warning(f"Table sequence mismatch: {current_merge_set[-1].table_idx} -> {frag.table_idx}")
                        # Force close previous and start new? Or just skip?
                        self._merge_and_add(section, current_merge_set)
                        current_merge_set = [] # Abandon orphan?

            if current_merge_set:
                self._merge_and_add(section, current_merge_set)

    def _merge_and_add(self, section, fragments: List[TableFragment]):
        """
        Merges a list of [Table 1, Table 2...] vertically (columns).
        """
        base_frag = fragments[0]
        # Map rows by index assuming strict order
        # Verification: Check classification names match
        
        final_rows = []
        
        # Determine Header mapping
        # This is where we need the detailed logic from previous V1 script for column mapping
        # But for now, let's just create a raw matrix
        
        num_rows = len(base_frag.rows)
        for i in range(num_rows):
            merged_item = {}
            base_row = base_frag.rows[i]
            
            classification = base_row['classification']
            merged_item['classification'] = classification
            
            all_values = []
            
            # Collect values from all fragments
            for frag in fragments:
                if i < len(frag.rows):
                    row = frag.rows[i]
                    # Verify alignment
                    # Fuzzy check? or just trust PDF line order?
                    # PDF table lines are usually stable.
                    if fuzz_ratio(row['classification'], classification) < 80 and len(row['classification']) > 5:
                         logging.warning(f"Row mismatch in merge: '{classification}' vs '{row['classification']}'")
                    
                    all_values.extend(row['values'])
            
            # Map values to semantic columns based on total count
            # This logic mimics the V1 "split_headers" but applied to the Full Value Set
            mapped = self.map_columns(all_values)
            merged_item.update(mapped)
            final_rows.append(merged_item)
            
        section.merged_data.extend(final_rows)

    def map_columns(self, values: List[str]) -> Dict[str, Any]:
        """
        Maps a list of raw value strings to semantic keys (Base, OT, etc.)
        Heuristic based on column count.
        """
        parsed = [self.parse_amount(v) for v in values]
        count = len(parsed)
        out = {"raw_values": parsed}
        
        # Common Broadcaster Award Pattern: 
        # [Weekly, Hourly, Sat, Sun, PubHol, OT_M-F_First, OT_M-F_After] (7 cols)
        # + [OT_Sat_First, OT_Sat_After, OT_Sun, OT_PubHol, Recall, Break] (6 cols in Table 2)
        # Total ~13 cols.
        
        # Heuristic: Find the smallest value that looks like a base hourly rate ($25-$150)
        # The weekly rate is usually > $800
        
        hourly = 0.0
        weekly = 0.0
        
        for v in parsed:
            if isinstance(v, float):
                if 20 < v < 200 and hourly == 0: hourly = v
                if v > 800 and weekly == 0: weekly = v
                
        out['base_hourly'] = hourly
        out['weekly_rate'] = weekly
        
        return out

    def to_json(self, output_path: str):
        data = {
            "sections": [
                {
                    "section_name": s.name,
                    "effective_date": s.effective_date,
                    "classifications": s.merged_data
                }
                for s in self.sections if s.merged_data
            ]
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

def fuzz_ratio(s1, s2):
    # Simple levenshtein or Jaccard
    if s1 == s2: return 100
    try:
        from thefuzz import fuzz
        return fuzz.ratio(s1, s2)
    except ImportError:
        return 50 # Default safe fallback
    
if __name__ == "__main__":
    parser = PayGuideParser("payguidepdf_G00912929.pdf")
    parser.parse()
    parser.to_json("pay_rates_v2.json")
