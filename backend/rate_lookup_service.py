"""
Rate Lookup Service
Queries pay_rates_v2.json for classification rates based on day type and hours worked.
"""
import json
import os
from typing import Optional, Dict, List
from datetime import date

class RateLookupService:
    """Service for looking up rates from payguide data"""
    
    def __init__(self, payguide_file: str = "pay_rates_v2.json"):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        # Payguide is in parent directory
        self.payguide_path = os.path.join(os.path.dirname(self.base_dir), payguide_file)
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
    
    def _find_classification(self, classification: str, section_filter: str = None) -> Optional[Dict]:
        """
        Find a classification entry in the payguide data
        
        Args:
            classification: Classification name (e.g., "Gaffer", "Technician A")
            section_filter: Optional filter for section name (e.g., "Television broadcasting")
        
        Returns:
            Classification data dict or None
        """
        for section in self._data.get("sections", []):
            section_name = section.get("section_name", "").lower()
            
            # Apply section filter if provided
            if section_filter and section_filter.lower() not in section_name:
                continue
            
            for cls in section.get("classifications", []):
                cls_name = cls.get("classification", "").lower()
                if classification.lower() == cls_name:
                    return {
                        **cls,
                        "section_name": section.get("section_name"),
                        "effective_date": section.get("effective_date")
                    }
        
        return None
    
    def get_hourly_rate(
        self,
        classification: str,
        day_type: str = 'WEEKDAY',
        hours_worked: float = 8.0,
        is_holiday: bool = False
    ) -> Dict:
        """
        Get the appropriate hourly rate for a classification based on context
        
        Args:
            classification: Classification name
            day_type: 'WEEKDAY', 'WEEKEND', or 'HOLIDAY'
            hours_worked: Number of hours worked
            is_holiday: Whether it's a public holiday
        
        Returns:
            Dict with rate info: {
                "hourly_rate": float,
                "rate_type": str,
                "base_hourly": float,
                "weekly_rate": float,
                "found": bool,
                "source": str
            }
        """
        cls_data = self._find_classification(classification)
        
        if not cls_data:
            # Fallback to base rate if classification not found
            return {
                "hourly_rate": 50.0,  # Default fallback
                "rate_type": "fallback",
                "base_hourly": 50.0,
                "weekly_rate": 1900.0,
                "found": False,
                "source": "Default fallback rate",
                "warning": f"Classification '{classification}' not found in payguide"
            }
        
        base_hourly = cls_data.get("base_hourly", 0)
        weekly_rate = cls_data.get("weekly_rate", 0)
        
        # Determine multiplier based on day type and hours
        if is_holiday or day_type == 'HOLIDAY':
            # Public holidays typically 2.5x or 2.0x depending on award
            # Using 2.5x as common rate
            rate_multiplier = 2.5
            rate_type = "public_holiday"
        elif day_type == 'WEEKEND':
            # Weekends typically 1.5x (Saturday) to 2.0x (Sunday)
            # Using 1.5x as conservative estimate
            rate_multiplier = 1.5
            rate_type = "weekend"
        else:
            # Weekday - check for overtime
            if hours_worked > 10:
                # Double time after 10 hours
                rate_multiplier = 2.0
                rate_type = "overtime_2x"
            elif hours_worked > 8:
                # Time and half after 8 hours
                rate_multiplier = 1.5
                rate_type = "overtime_1.5x"
            else:
                # Standard rate
                rate_multiplier = 1.0
                rate_type = "standard"
        
        hourly_rate = base_hourly * rate_multiplier
        
        return {
            "hourly_rate": round(hourly_rate, 2),
            "rate_type": rate_type,
            "rate_multiplier": rate_multiplier,
            "base_hourly": base_hourly,
            "weekly_rate": weekly_rate,
            "found": True,
            "source": cls_data.get("section_name", "Unknown"),
            "effective_date": cls_data.get("effective_date")
        }
    
    def calculate_day_cost(
        self,
        classification: str,
        hours: float,
        day_type: str = 'WEEKDAY',
        is_holiday: bool = False
    ) -> Dict:
        """
        Calculate total cost for a single day using tiered overtime brackets
        
        Args:
            classification: Classification name
            hours: Hours worked
            day_type: 'WEEKDAY', 'WEEKEND', or 'HOLIDAY'
            is_holiday: Whether it's a public holiday
        
        Returns:
            Dict with cost breakdown including per-tier details
        """
        # Load tiered rates database
        tiered_rates_file = os.path.join(self.base_dir, "tiered_rates.json")
        
        try:
            with open(tiered_rates_file, 'r') as f:
                tiered_db = json.load(f)
        except FileNotFoundError:
            # Fallback to old method if tiered rates not available
            return self._fallback_day_cost(classification, hours, day_type, is_holiday)
        
        # Find classification in tiered database
        if classification not in tiered_db:
            return self._fallback_day_cost(classification, hours, day_type, is_holiday)
        
        rate_data = tiered_db[classification]
        base_hourly = rate_data['base_hourly']
        
        # Determine day type and calculate
        if is_holiday:
            # Public holidays: flat rate for all hours
            holiday_rate = rate_data['public_holiday']['rate']
            total_cost = holiday_rate * hours
            
            return {
                "day_cost": round(total_cost, 2),
                "hourly_rate": holiday_rate,
                "rate_type": "public_holiday",
                "rate_multiplier": rate_data['public_holiday']['multiplier'],
                "hours": hours,
                "day_type": "HOLIDAY",
                "is_holiday": True,
                "base_hourly": base_hourly,
                "tier_breakdown": [{
                    "hours_range": f"0-{hours}",
                    "hours": hours,
                    "rate": holiday_rate,
                    "multiplier": rate_data['public_holiday']['multiplier'],
                    "description": "Public Holiday",
                    "cost": round(total_cost, 2)
                }],
                "found": True,
                "source": rate_data['section']
            }
        
        elif day_type == 'WEEKEND':
            # Determine Saturday vs Sunday (using Saturday for now)
            weekend_rate = rate_data['saturday']['rate']
            total_cost = weekend_rate * hours
            
            return {
                "day_cost": round(total_cost, 2),
                "hourly_rate": weekend_rate,
                "rate_type": "weekend",
                "rate_multiplier": rate_data['saturday']['multiplier'],
                "hours": hours,
                "day_type": day_type,
                "is_holiday": False,
                "base_hourly": base_hourly,
                "tier_breakdown": [{
                    "hours_range": f"0-{hours}",
                    "hours": hours,
                    "rate": weekend_rate,
                    "multiplier": rate_data['saturday']['multiplier'],
                    "description": "Weekend",
                    "cost": round(total_cost, 2)
                }],
                "found": True,
                "source": rate_data['section']
            }
        
        else:
            # Weekday: use tiered brackets
            brackets = rate_data['weekday_brackets']
            tier_breakdown = []
            total_cost = 0
            
            for bracket in brackets:
                start_hr, end_hr = bracket['hours_range']
                
                # Skip if we haven't reached this bracket yet
                if hours <= start_hr:
                    break
                
                # Calculate hours in this bracket
                bracket_hours = min(hours, end_hr) - start_hr
                if bracket_hours <= 0:
                    continue
                
                bracket_cost = bracket['rate'] * bracket_hours
                total_cost += bracket_cost
                
                tier_breakdown.append({
                    "hours_range": f"{start_hr}-{end_hr if end_hr != float('inf') else ''}",
                    "hours": bracket_hours,
                    "rate": bracket['rate'],
                    "multiplier": bracket['multiplier'],
                    "description": bracket['description'],
                    "cost": round(bracket_cost, 2)
                })
            
            # Calculate effective hourly rate
            effective_hourly = total_cost / hours if hours > 0 else 0
            effective_multiplier = effective_hourly / base_hourly if base_hourly > 0 else 0
            
            return {
                "day_cost": round(total_cost, 2),
                "hourly_rate": round(effective_hourly, 2),
                "rate_type": "tiered",
                "rate_multiplier": round(effective_multiplier, 2),
                "hours": hours,
                "day_type": day_type,
                "is_holiday": False,
                "base_hourly": base_hourly,
                "tier_breakdown": tier_breakdown,
                "found": True,
                "source": rate_data['section']
            }
    
    def _fallback_day_cost(self, classification: str, hours: float, day_type: str, is_holiday: bool) -> Dict:
        """Fallback to old single-multiplier method"""
        rate_info = self.get_hourly_rate(classification, day_type, hours, is_holiday)
        total_cost = rate_info["hourly_rate"] * hours
        
        return {
            **rate_info,
            "hours": hours,
            "day_cost": round(total_cost, 2),
            "day_type": day_type,
            "is_holiday": is_holiday,
            "tier_breakdown": [{
                "hours_range": f"0-{hours}",
                "hours": hours,
                "rate": rate_info["hourly_rate"],
                "multiplier": rate_info.get("rate_multiplier", 1.0),
                "description": rate_info.get("rate_type", "standard"),
                "cost": round(total_cost, 2)
            }]
        }
    
    def search_classifications(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Search for classifications matching a query using the tiered rates database
        
        Args:
            query: Search term
            limit: Maximum results to return
        
        Returns:
            List of matching classifications with unique keys
        """
        # Load tiered rates if not already loaded in memory (optimization: could cache this)
        tiered_rates_file = os.path.join(self.base_dir, "tiered_rates.json")
        try:
            with open(tiered_rates_file, 'r') as f:
                tiered_db = json.load(f)
        except Exception:
            # Fallback to empty list or original method if db missing
            print("Error loading tiered rates for search")
            return []

        results = []
        query_lower = query.lower()
        
        # Search against unique keys in tiered_db
        for unique_key, data in tiered_db.items():
            # Match against unique key OR original name
            if query_lower in unique_key.lower() or query_lower in data.get('original_name', '').lower():
                results.append({
                    "classification": unique_key,  # Use the unique key
                    "original_name": data.get('original_name', unique_key),
                    "base_hourly": data.get('base_hourly', 0),
                    # Weekday brackets contains rate info
                    "weekly_rate": 0, # Could calculate if needed, or store in db
                    "section": data.get('section', ''),
                    "award": data.get('section', '').split(' - ')[0]
                })
                
                if len(results) >= limit:
                    break
        
        # Sort results by relevance (exact match first)
        results.sort(key=lambda x: (
            x['classification'].lower() != query_lower,  # Exact match first
            len(x['classification'])  # Shorter matches first
        ))
        
        return results[:limit]


# Singleton instance
_rate_service = None

def get_rate_service() -> RateLookupService:
    """Get or create the singleton rate lookup service instance"""
    global _rate_service
    if _rate_service is None:
        _rate_service = RateLookupService()
    return _rate_service
