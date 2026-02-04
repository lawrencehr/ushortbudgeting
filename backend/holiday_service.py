"""
NSW Public Holiday Service
Fetches and caches NSW public holidays from data.gov.au API
"""
import requests
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
import json
import os

class NSWHolidayService:
    """Service for fetching NSW public holidays"""
    
    API_URL = "https://data.gov.au/data/api/3/action/datastore_search"
    RESOURCE_ID = "33673aca-0857-42e5-b8f0-9981b4755686"
    CACHE_FILE = "nsw_holidays_cache.json"
    CACHE_DURATION_DAYS = 30
    
    def __init__(self, base_dir: str = None):
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        self.cache_path = os.path.join(self.base_dir, self.CACHE_FILE)
    
    def _load_cache(self) -> Optional[Dict]:
        """Load cached holiday data if valid"""
        try:
            if not os.path.exists(self.cache_path):
                return None
            
            with open(self.cache_path, 'r') as f:
                cache_data = json.load(f)
            
            # Check if cache is expired
            cached_date = datetime.fromisoformat(cache_data.get('cached_at', ''))
            if datetime.now() - cached_date > timedelta(days=self.CACHE_DURATION_DAYS):
                return None
            
            return cache_data
        except Exception:
            return None
    
    def _save_cache(self, holidays: List[Dict]) -> None:
        """Save holiday data to cache"""
        try:
            cache_data = {
                'cached_at': datetime.now().isoformat(),
                'holidays': holidays
            }
            with open(self.cache_path, 'w') as f:
                json.dump(cache_data, f)
        except Exception as e:
            print(f"Warning: Failed to cache holidays: {e}")
    
    def _fetch_from_api(self) -> List[Dict]:
        """Fetch holidays from data.gov.au API"""
        params = {
            "resource_id": self.RESOURCE_ID,
            "limit": 2000
        }
        
        try:
            response = requests.get(self.API_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            records = data.get("result", {}).get("records", [])
            
            # Transform to our format
            holidays = [
                {
                    "date": record["Date"],
                    "name": record.get("Holiday Name", "Public Holiday"),
                    "jurisdiction": record.get("Jurisdiction", "nsw").lower()
                }
                for record in records
                if "Date" in record and record.get("Jurisdiction", "").lower() == "nsw"
            ]
            
            return holidays
        except Exception as e:
            print(f"Error fetching holidays from API: {e}")
            return []
    
    def get_all_holidays(self, force_refresh: bool = False) -> List[Dict]:
        """
        Get all NSW public holidays
        """
        holidays = []
        if not force_refresh:
            cache_data = self._load_cache()
            if cache_data:
                holidays = cache_data.get('holidays', [])
        
        # If no cache or force refresh, fetch from API
        if not holidays:
            holidays = self._fetch_from_api()
            if holidays:
                self._save_cache(holidays)
        
        # Merge with hardcoded 2026 fallback (since API stops at 2025)
        fallback_2026 = [
            {"date": "2026-01-01", "name": "New Year's Day", "jurisdiction": "nsw"},
            {"date": "2026-01-26", "name": "Australia Day", "jurisdiction": "nsw"},
            {"date": "2026-04-03", "name": "Good Friday", "jurisdiction": "nsw"},
            {"date": "2026-04-04", "name": "Day after Good Friday", "jurisdiction": "nsw"},
            {"date": "2026-04-05", "name": "Easter Sunday", "jurisdiction": "nsw"},
            {"date": "2026-04-06", "name": "Easter Monday", "jurisdiction": "nsw"},
            {"date": "2026-04-25", "name": "Anzac Day", "jurisdiction": "nsw"},
            {"date": "2026-06-08", "name": "King's Birthday", "jurisdiction": "nsw"},
            {"date": "2026-08-03", "name": "Bank Holiday", "jurisdiction": "nsw"},
            {"date": "2026-10-05", "name": "Labour Day", "jurisdiction": "nsw"},
            {"date": "2026-12-25", "name": "Christmas Day", "jurisdiction": "nsw"},
            {"date": "2026-12-26", "name": "Boxing Day", "jurisdiction": "nsw"},
            {"date": "2026-12-28", "name": "Boxing Day (Observed)", "jurisdiction": "nsw"},
        ]
        
        # Check if we already have 2026 in API (just in case they updated it)
        api_has_2026 = any("2026" in h["date"] for h in holidays)
        if not api_has_2026:
            # Only add holidays that aren't already there (matching by date)
            existing_dates = {h["date"] for h in holidays}
            for fallback in fallback_2026:
                if fallback["date"] not in existing_dates:
                    holidays.append(fallback)
        
        return holidays
    
    def get_holidays_in_range(
        self, 
        start_date: date, 
        end_date: date,
        force_refresh: bool = False
    ) -> List[Dict]:
        """
        Get NSW public holidays within a date range
        
        Args:
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            force_refresh: If True, bypass cache
        
        Returns:
            List of holidays in the date range, sorted by date
        """
        all_holidays = self.get_all_holidays(force_refresh=force_refresh)
        
        filtered = []
        for holiday in all_holidays:
            try:
                date_str = holiday["date"]
                # Try multiple formats
                holiday_date = None
                for fmt in ("%Y-%m-%d", "%Y%%m%d", "%Y%m%d"):
                    try:
                        holiday_date = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
                
                if holiday_date and start_date <= holiday_date <= end_date:
                    filtered.append({
                        **holiday,
                        "date_obj": holiday_date
                    })
            except (ValueError, KeyError, TypeError):
                continue
        
        # Sort by date
        filtered.sort(key=lambda h: h["date_obj"])
        
        return filtered
    
    def is_holiday(self, check_date: date, force_refresh: bool = False) -> bool:
        """
        Check if a specific date is a NSW public holiday
        
        Args:
            check_date: Date to check
            force_refresh: If True, bypass cache
        
        Returns:
            True if the date is a public holiday
        """
        holidays = self.get_holidays_in_range(
            check_date, 
            check_date, 
            force_refresh=force_refresh
        )
        return len(holidays) > 0
    
    def get_holiday_name(self, check_date: date) -> Optional[str]:
        """
        Get the name of the holiday on a specific date
        
        Args:
            check_date: Date to check
        
        Returns:
            Holiday name if it exists, None otherwise
        """
        holidays = self.get_holidays_in_range(check_date, check_date)
        if holidays:
            return holidays[0]["name"]
        return None


# Singleton instance
_holiday_service = None

def get_holiday_service() -> NSWHolidayService:
    """Get or create the singleton holiday service instance"""
    global _holiday_service
    if _holiday_service is None:
        _holiday_service = NSWHolidayService()
    return _holiday_service
