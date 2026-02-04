from typing import Dict, Optional, List, Any
from datetime import datetime, date, timedelta
from sqlmodel import Session, select
from models import ProductionCalendar, CalendarDay, BudgetGrouping
from rate_lookup_service import get_rate_service
from holiday_service import get_holiday_service
from pydantic import BaseModel

class LaborCostRequest(BaseModel):
    line_item_id: Optional[str] = None
    base_hourly_rate: float
    is_casual: bool
    is_artist: bool = False
    
    # Calendar resolution
    calendar_mode: str = "inherit" # "inherit" | "custom"
    phase_details: Optional[Dict[str, Any]] = None # Custom calendar if mode=custom
    grouping_id: Optional[str] = None # For inherit mode
    project_id: str
    
    # Optional overrides
    award_classification_id: Optional[str] = None

class LaborCostResponse(BaseModel):
    total_cost: float
    breakdown: Dict[str, Any]
    fringes: Dict[str, float]

def calculate_labor_cost(session: Session, req: LaborCostRequest, fringe_settings: Any) -> LaborCostResponse:
    rate_service = get_rate_service()
    holiday_service = get_holiday_service()
    
    # 1. Resolve Calendar Configuration (Hierarchy: Line Item > Group > Global)
    
    # Base: Defaults
    effective_calendar = {
        "preProd": {"defaultHours": 8.0, "dates": []},
        "shoot": {"defaultHours": 10.0, "dates": []},
        "postProd": {"defaultHours": 8.0, "dates": []}
    }
    
    # Step A: Load Global Calendar Settings (Foundation)
    calendars = session.exec(select(ProductionCalendar).where(ProductionCalendar.project_id == req.project_id)).all()
    global_map = {"PRE_PROD": "preProd", "SHOOT": "shoot", "POST_PROD": "postProd"}
    
    for cal in calendars:
        phase_key = global_map.get(cal.phase, cal.phase.lower())
        if phase_key in effective_calendar:
            effective_calendar[phase_key]["defaultHours"] = cal.default_hours
            days = session.exec(select(CalendarDay).where(CalendarDay.calendar_id == cal.id)).all()
            effective_calendar[phase_key]["dates"] = [d.date.isoformat() for d in days]

    # Step B: Apply Grouping Overrides (Middle Tier)
    if req.grouping_id:
        grouping = session.get(BudgetGrouping, req.grouping_id)
        if grouping and grouping.calendar_overrides:
            overrides = grouping.calendar_overrides
            for phase in effective_calendar:
                if phase in overrides:
                     ov = overrides[phase]
                     # If Group has explicitly disabled inheritance for this phase, it takes precedence over Global
                     if ov.get("inherit") == False:
                         if "defaultHours" in ov:
                             effective_calendar[phase]["defaultHours"] = float(ov["defaultHours"])
                         if "dates" in ov:
                             effective_calendar[phase]["dates"] = ov["dates"]
    
    # Step C: Apply Line Item Overrides (Top Tier)
    # We check phase_details provided in the request (passed from UI or stored in LineItem.phase_details)
    item_overrides = req.phase_details
    
    if item_overrides:
        for phase in effective_calendar:
            if phase in item_overrides:
                ov = item_overrides[phase]
                # If Line Item has explicitly disabled inheritance for this phase, it wins over both Group and Global
                if ov.get("inherit") == False:
                    if "defaultHours" in ov:
                        effective_calendar[phase]["defaultHours"] = float(ov["defaultHours"])
                    if "dates" in ov:
                        effective_calendar[phase]["dates"] = ov["dates"]
    
    # Special case: If explicitly set to "custom" mode, we should ensure we are using the item_overrides
    # the above loop already handles this if inherit:false is set in the phase_details.
    
    # helper to generate dates
    def generate_weekdays(start_date: date, count: int) -> List[str]:
        dates = []
        current = start_date
        while len(dates) < count:
            if current.weekday() < 5: # Mon-Fri
                dates.append(current.isoformat())
            current += timedelta(days=1)
        return dates
    
    # Check if we ended up with empty dates in inherit mode, and if so, apply Defaults
    has_any_dates = any(len(c["dates"]) > 0 for c in effective_calendar.values())
    
    if req.calendar_mode == "inherit" and not has_any_dates:
        # Apply Defaults
        start_def = date(2026, 2, 1) # Arbitrary default start
        
        # Prep
        effective_calendar["preProd"]["dates"] = generate_weekdays(start_def, 10)
        
        # Shoot starts 2 weeks later roughly
        shoot_start = start_def + timedelta(days=14)
        effective_calendar["shoot"]["dates"] = generate_weekdays(shoot_start, 20)
        
        post_start = shoot_start + timedelta(days=28) # 20 working days is ~4 weeks
        effective_calendar["postProd"]["dates"] = generate_weekdays(post_start, 10)

    # 2. Calculate Costs per Phase
    breakdown = {}
    total_gross = 0.0
    
    for phase_key, config in effective_calendar.items():
        phase_total = 0.0
        details_list = []
        days_count = 0
        
        hours = config["defaultHours"]
        date_strings = config["dates"]
        
        active_dates = []
        for d_str in date_strings:
            try:
                # Handle ISO string with/without Z
                d_obj = datetime.fromisoformat(d_str.replace('Z', '')).date()
                active_dates.append(d_obj)
            except ValueError:
                continue
                
        # Sort dates
        active_dates.sort()
        
        for d_obj in active_dates:
            days_count += 1
            
            # Determine Day Type
            weekday = d_obj.weekday() # 0=Mon, 6=Sun
            day_type = 'WEEKDAY'
            if weekday == 5: day_type = 'SATURDAY'
            elif weekday == 6: day_type = 'SUNDAY'
            
            # Check Holiday
            is_holiday = False
            holidays = holiday_service.get_holidays_in_range(d_obj, d_obj)
            if holidays:
                is_holiday = True
                
            # Calculate Day Cost
            cost_res = rate_service.calculate_day_cost(
                classification="Manual", # We use overrides
                hours=hours,
                day_type=day_type,
                is_holiday=is_holiday,
                override_base_rate=req.base_hourly_rate,
                override_is_casual=req.is_casual,
                override_section_name="Category E" if req.is_artist else "Crew"
            )
            
            day_cost = cost_res["day_cost"]
            phase_total += day_cost
            
            details_list.append({
                "date": d_obj.isoformat(),
                "day_type": day_type,
                "is_holiday": is_holiday,
                "hours": hours,
                "base_cost": cost_res.get("base_hourly", 0) * hours, # Approx
                "total_day_cost": day_cost,
                "multiplier": 1.0 
            })
            
        total_gross += phase_total
        breakdown[phase_key] = {
            "days": days_count,
            "cost": round(phase_total, 2),
            "details": details_list
        }

    # 3. Calculate Fringes
    # "apply fringes from settings (Super, Holiday Pay , Payroll Tax, Workers Comp)"
    
    super_amt = total_gross * (fringe_settings.superannuation / 100.0)
    
    holiday_pay_amt = 0.0
    if not req.is_casual:
        holiday_pay_amt = total_gross * (fringe_settings.holiday_pay / 100.0)
        
    payroll_tax_amt = total_gross * (fringe_settings.payroll_tax / 100.0)
    workers_comp_amt = total_gross * (fringe_settings.workers_comp / 100.0)
    
    total_fringes = super_amt + holiday_pay_amt + payroll_tax_amt + workers_comp_amt
    
    # To ensure visual consistency in UI (sum of components = total),
    # we round components first then sum them.
    super_rounded = round(super_amt, 2)
    holiday_pay_rounded = round(holiday_pay_amt, 2)
    payroll_tax_rounded = round(payroll_tax_amt, 2)
    workers_comp_rounded = round(workers_comp_amt, 2)
    
    total_fringes_rounded = round(super_rounded + holiday_pay_rounded + payroll_tax_rounded + workers_comp_rounded, 2)
    
    fringes = {
        "super": super_rounded,
        "holiday_pay": holiday_pay_rounded,
        "payroll_tax": payroll_tax_rounded,
        "workers_comp": workers_comp_rounded,
        "total_fringes": total_fringes_rounded
    }

    return LaborCostResponse(
        total_cost=round(total_gross, 2),
        breakdown=breakdown,
        fringes=fringes
    )
