"""
Rate Lookup Service
Queries award_rates.json for classification rates based on day type and hours worked.
"""
import json
import os
from typing import Optional, Dict, List

class RateLookupService:
    """Service for looking up rates from payguide data"""
    
    def __init__(self, payguide_file: str = "data/award_rates.json"):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.payguide_path = os.path.join(self.base_dir, payguide_file)
        self._data = None
        self._load_data()
    
    def _load_data(self):
        """Load payguide data from JSON file"""
        try:
            with open(self.payguide_path, 'r', encoding='utf-8') as f:
                self._data = json.load(f)
        except Exception as e:
            print(f"Error loading payguide data: {e}")
            self._data = {"sections": []}
    
    def _find_classification(self, classification: str) -> Optional[Dict]:
        """Find a classification entry in the payguide data"""
        for section in self._data.get("sections", []):
            for cls in section.get("classifications", []):
                 # Exact match preferred, but could be loose
                 if classification.lower() == cls.get("classification", "").lower():
                     # Filter out bad parsing
                     if cls.get("hourly_rate", 0) <= 0: continue
                     
                     return {
                         **cls,
                         "section_name": section.get("name"),
                         "base_hourly": cls.get("hourly_rate", 0)
                     }
        return None

    def search_classifications(self, query: str, limit: int = 20) -> List[Dict]:
        """Search for classifications matching a query"""
        results = []
        query_lower = query.lower()
        
        seen_keys = set()
        
        for section in self._data.get("sections", []):
            section_name = section.get("name", "")
            for cls in section.get("classifications", []):
                cls_name = cls.get("classification", "")
                rate = cls.get("hourly_rate", 0)
                
                if rate <= 0: continue
                if not cls_name: continue
                
                if query_lower in cls_name.lower():
                    key = f"{cls_name}_{rate}"
                    if key in seen_keys: continue
                    seen_keys.add(key)
                    
                    results.append({
                        "classification": cls_name,
                        "hourly_rate": rate,
                        "base_hourly": rate,
                        "section_name": section_name,
                        "section": section_name,
                        "_meta_source": cls.get("_meta_source", ""),
                        "award": "Broadcasting" # Generic for now
                    })
                    if len(results) >= limit:
                        break
            if len(results) >= limit:
                break
                
        return results

    def calculate_day_cost(
        self,
        classification: str,
        hours: float,
        day_type: str = 'WEEKDAY',
        is_holiday: bool = False,
        override_base_rate: Optional[float] = None,
        override_is_casual: Optional[bool] = None,
        override_section_name: Optional[str] = None
    ) -> Dict:
        """
        Calculate total cost for a single day using HARDCODED rules (Spec 4.2)
        """
        if override_base_rate is not None:
            base_hourly = override_base_rate
            section_name = override_section_name or "Unknown"
            # If override provided, we might skip lookup or use it just for classification name
        else:
            cls_data = self._find_classification(classification)
            if not cls_data:
                # Fallback
                base_hourly = 50.0
                section_name = "Unknown"
            else:
                base_hourly = cls_data.get("base_hourly", 50.0)
                section_name = cls_data.get("section_name", "")

        # Determine Rule Set
        # Artist if section contains "Artist" or "Category E"
        is_artist = "artist" in section_name.lower() or "category e" in section_name.lower()
        
        # Determine Casual
        if override_is_casual is not None:
            is_casual = override_is_casual
        else:
            # Hardcode casual logic detection for now (e.g. if classification contains "Casual")
            is_casual = "casual" in classification.lower()

        # Calculate Cost
        total_cost = 0.0
        details = []
        
        # Enforce 4h min call? (Spec says "Enforce 4h Minimum Call")
        # For budgeting purposes, we often stick to what's scheduled, but let's be safe.
        effective_hours = max(hours, 4.0)

        # 1. ARTIST RULES (Category E)
        if is_artist:
            if is_casual:
                # 2. Casual Artists
                if is_holiday:
                   # Public Holiday: All Hours 2.5x
                   rate = base_hourly * 2.5
                   total_cost = effective_hours * rate
                   details.append(f"Casual PH (2.5x): {effective_hours}h")
                elif day_type == 'SUNDAY':
                   # Sunday: All Hours 2.0x
                   rate = base_hourly * 2.0
                   total_cost = effective_hours * rate
                   details.append(f"Casual Sun (2.0x): {effective_hours}h")
                else: 
                   # Mon-Sat (includes Saturday for Artists according to spec?)
                   # Spec says "Monday – Saturday" for Artists
                   # 0 - 7.6h: 1.25x Base
                   block1 = min(effective_hours, 7.6)
                   total_cost += block1 * base_hourly * 1.25
                   details.append(f"Casual Base (1.25x): {block1}h")
                   
                   remaining = effective_hours - block1
                   if remaining > 0:
                       # 7.6 – 9.6h: 1.875x Base
                       block2 = min(remaining, 2.0)
                       total_cost += block2 * base_hourly * 1.875
                       details.append(f"Casual OT 1.5x+Load (1.875x): {block2}h")
                       remaining -= block2
                   
                   if remaining > 0:
                       # 9.6h+: 2.5x Base
                       total_cost += remaining * base_hourly * 2.5
                       details.append(f"Casual OT 2.0x+Load? (2.5x): {remaining}h")
            else:
                # 1. Full-Time & Part-Time Artists
                if is_holiday:
                    # All Hours: 2.5x Base
                    total_cost = effective_hours * base_hourly * 2.5
                    details.append(f"PH (2.5x): {effective_hours}h")
                elif day_type == 'SUNDAY':
                     # All Hours: 2.0x Base
                     total_cost = effective_hours * base_hourly * 2.0
                     details.append(f"Sunday (2.0x): {effective_hours}h")
                else:
                     # Monday – Saturday
                     # 0 – 7.6h: 1.0x Base
                     block1 = min(effective_hours, 7.6)
                     total_cost += block1 * base_hourly
                     details.append(f"Base (1.0x): {block1}h")
                     
                     remaining = effective_hours - block1
                     if remaining > 0:
                         # 7.6 – 9.6h: 1.5x Base
                         block2 = min(remaining, 2.0)
                         total_cost += block2 * base_hourly * 1.5
                         details.append(f"OT 1.5x: {block2}h")
                         remaining -= block2
                     
                     if remaining > 0:
                         # 9.6h+: 2.0x Base
                         total_cost += remaining * base_hourly * 2.0
                         details.append(f"OT 2.0x: {remaining}h")

        # 2. CREW RULES (All other labour lines)
        else:
            if is_casual:
                 # 2. Casual Crew
                if is_holiday:
                     # All Hours: 3.125x Base
                     total_cost = effective_hours * base_hourly * 3.125
                     details.append(f"Casual PH (3.125x): {effective_hours}h")
                elif day_type == 'SUNDAY':
                    # 0 – 7.6h: 2x Base
                    # 7.6h+: 2.5x Base
                    block1 = min(effective_hours, 7.6)
                    total_cost += block1 * base_hourly * 2.0
                    details.append(f"Casual Sun Base (2.0x): {block1}h")
                    
                    remaining = effective_hours - block1
                    if remaining > 0:
                        total_cost += remaining * base_hourly * 2.5
                        details.append(f"Casual Sun OT (2.5x): {remaining}h")
                
                elif day_type == 'SATURDAY':
                     # 0 – 7.6h: 1.75x Base
                     # 7.6 – 9.6h: 2.1875x Base
                     # 9.6h+: 2.5x Base
                     block1 = min(effective_hours, 7.6)
                     total_cost += block1 * base_hourly * 1.75
                     details.append(f"Casual Sat Base (1.75x): {block1}h")
                     
                     remaining = effective_hours - block1
                     if remaining > 0:
                         block2 = min(remaining, 2.0)
                         total_cost += block2 * base_hourly * 2.1875
                         details.append(f"Casual Sat OT (2.1875x): {block2}h")
                         remaining -= block2
                         
                     if remaining > 0:
                         total_cost += remaining * base_hourly * 2.5
                         details.append(f"Casual Sat OT (2.5x): {remaining}h")
                
                else: 
                     # Monday – Friday (Casual)
                     # 0 – 7.6h: 1.25x Base (Standard Casual Rate)
                     block1 = min(effective_hours, 7.6)
                     total_cost += block1 * base_hourly * 1.25
                     details.append(f"Casual Base (1.25x): {block1}h")
                     
                     remaining = effective_hours - block1
                     if remaining > 0:
                         # 7.6 – 9.6h: 1.875x Base
                         block2 = min(remaining, 2.0)
                         total_cost += block2 * base_hourly * 1.875
                         details.append(f"Casual OT (1.875x): {block2}h")
                         remaining -= block2
                         
                     if remaining > 0:
                         # 9.6h+: 2.5x Base
                         total_cost += remaining * base_hourly * 2.5
                         details.append(f"Casual OT (2.5x): {remaining}h")

            else:
                # 1. Full-Time & Part-Time Crew
                if is_holiday:
                    # All Hours: 2.5x Base
                    total_cost = effective_hours * base_hourly * 2.5
                    details.append(f"Pub Hol (2.5x): {effective_hours}h")
                elif day_type == 'SUNDAY':
                    # 0 – 7.6h: 1.75x Base (Ordinary Penalty)
                    # 7.6h+: 2.0x Base
                    block1 = min(effective_hours, 7.6)
                    total_cost += block1 * base_hourly * 1.75
                    details.append(f"Sun Base (1.75x): {block1}h")
                    
                    remaining = effective_hours - block1
                    if remaining > 0:
                        total_cost += remaining * base_hourly * 2.0
                        details.append(f"Sun OT (2.0x): {remaining}h")
                
                elif day_type == 'SATURDAY': 
                     # 0 – 7.6h: 1.5x Base (Ordinary Penalty)
                     # 7.6 – 9.6h: 1.75x Base
                     # 9.6h+: 2.0x Base
                     block1 = min(effective_hours, 7.6)
                     total_cost += block1 * base_hourly * 1.5
                     details.append(f"Sat Base (1.5x): {block1}h")
                     
                     remaining = effective_hours - block1
                     if remaining > 0:
                         block2 = min(remaining, 2.0)
                         total_cost += block2 * base_hourly * 1.75
                         details.append(f"Sat OT (1.75x): {block2}h")
                         remaining -= block2
                         
                     if remaining > 0:
                         total_cost += remaining * base_hourly * 2.0
                         details.append(f"Sat OT (2.0x): {remaining}h")
                
                else: # Mon-Fri (Standard Crew)
                     # 0 – 7.6h: 1.0x Base
                     block1 = min(effective_hours, 7.6)
                     total_cost += block1 * base_hourly
                     details.append(f"Base (1.0x): {block1}h")
                     
                     remaining = effective_hours - block1
                     if remaining > 0:
                         # 7.6 – 9.6h: 1.5x Base
                         block2 = min(remaining, 2.0)
                         total_cost += block2 * base_hourly * 1.5
                         details.append(f"OT 1.5x: {block2}h")
                         remaining -= block2
                         
                     if remaining > 0:
                         # 9.6h+: 2.0x Base
                         total_cost += remaining * base_hourly * 2.0
                         details.append(f"OT 2.0x: {remaining}h")

        return {
            "day_cost": round(total_cost, 2),
            "base_hourly": base_hourly,
            "hours": effective_hours,
            "breakdown": details,
            "source": section_name
        }

# Singleton instance
_rate_service = None

def get_rate_service() -> RateLookupService:
    global _rate_service
    if _rate_service is None:
        _rate_service = RateLookupService()
    return _rate_service
