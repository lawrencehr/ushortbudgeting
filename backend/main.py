import os
import json
import shutil
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func
from contextlib import asynccontextmanager

from database import create_db_and_tables, get_session
from models import (
    Project, Budget, BudgetCategory, BudgetGrouping, LineItem, ProjectPhase,
    BudgetCategoryBase, BudgetGroupingBase, LineItemBase,
    ProductionCalendar, CalendarDay, LaborSchedule, ScheduleDay, RoleHistory
)
from labor_engine import calculate_complex_rate, LaborConfig, Allowance
from holiday_service import get_holiday_service
from rate_lookup_service import get_rate_service

# --- Configuration & Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RATES_FILE = os.path.join(BASE_DIR, "rates.json")
FRINGE_SETTINGS_FILE = os.path.join(BASE_DIR, "fringe_settings.json")

# --- Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Shared Schemas (Pydantic / Non-DB) ---
from crew_router import router as crew_router

app.include_router(crew_router, prefix="/api/crew", tags=["crew"])

from template_router import router as template_router
app.include_router(template_router, prefix="/api", tags=["templates"])

from pydantic import BaseModel

class LaborAllowance(BaseModel):
    name: str
    amount: float
    frequency: str = "day" # "day" or "week"

class ShiftInput(BaseModel):
    hours: float
    type: str = "Standard" # Standard, Saturday, Sunday, PublicHoliday
    count: int = 1

class FringeSettings(BaseModel):
    superannuation: float = 11.5
    holiday_pay: float = 4.0
    payroll_tax: float = 4.85
    workers_comp: float = 1.5
    contingency: float = 10.0

class CatalogItem(BaseModel):
    description: str
    default_rate: float
    default_category_id: str
    default_category_name: str
    is_labor: bool

class LaborCalcRequest(BaseModel):
    base_hourly_rate: float
    daily_hours: float
    days_per_week: float = 5
    is_casual: bool
    is_artist: bool = False # New field
    overtime_rule_set: str = "Standard"
    ot_threshold_15: float = 8.0
    ot_threshold_20: float = 10.0
    allowances: List[LaborAllowance] = []
    shifts: List[ShiftInput] = [] # Optional advanced input

# --- Logic: Labor Calculation ---
def calculate_weekly_labor_rate(req: LaborCalcRequest) -> float:
    # Use RateLookupService for V2 accurate calculations
    rate_service = get_rate_service()
    
    # 1. Determine Shifts to Process
    shifts_to_process = []
    if req.shifts and len(req.shifts) > 0:
        shifts_to_process = req.shifts
    else:
        # Fallback: Generate standard shifts based on days_per_week
        full_days = int(req.days_per_week)
        remainder = req.days_per_week - full_days
        
        if full_days > 0:
            shifts_to_process.append(ShiftInput(hours=req.daily_hours, type="Standard", count=full_days))
        if remainder > 0:
             # Treat remainder as a partial day (or full day with less hours? Standard usually pro-rata by cost, here we'll add a shift)
             shifts_to_process.append(ShiftInput(hours=req.daily_hours, type="Standard", count=1)) # Logic below handles count, but remainder count? 
             # Actually count is int. 
             # Let's clean this up: The legacy loop supports fractional count if we fix the loop, 
             # but mapped to ShiftInput(count=int).
             # For correctness, let's stick to full days here for V2, simple scalar calc for legacy?
             # If we use V2 logic, we iterate shifts.
             pass

    # 2. Calculate Cost
    weekly_gross = 0.0
    
    # Handle allowances outside shift loop for now? 
    daily_allowances_cost = 0.0
    weekly_extras = 0.0
    for allce in req.allowances:
        if allce.frequency == "week":
            weekly_extras += allce.amount
        else:
            daily_allowances_cost += allce.amount # Per day

    if not req.shifts and req.days_per_week > 0:
        # Simple Mode Legacy / Hybrid
        # If we have fractional days, simple math is best.
        # But we want to use new rules?
        category_name = "Category E" if req.is_artist else "Crew"
        
        # We need a 1-day cost
        base_day_cost = rate_service.calculate_day_cost(
            classification="Manual Rate", # Dummy
            hours=req.daily_hours,
            day_type="WEEKDAY",
            is_holiday=False,
            # We need to support override_base_rate in service!
            override_base_rate=req.base_hourly_rate,
            override_is_casual=req.is_casual,
            override_section_name=category_name 
        )["day_cost"]
        
        # Add daily allowances
        base_day_cost += daily_allowances_cost
        
        weekly_gross = (base_day_cost * req.days_per_week) + weekly_extras
        return weekly_gross

    # Advanced Mode (Shift Based)
    for shift in shifts_to_process:
        # Map Type
        dt = "WEEKDAY"
        is_hol = False
        
        if shift.type == "Saturday": dt = "SATURDAY"
        elif shift.type == "Sunday": dt = "SUNDAY"
        elif shift.type == "PublicHoliday": is_hol = True
        
        category_name = "Category E" if req.is_artist else "Crew"
        
        result = rate_service.calculate_day_cost(
            classification="Manual Rate",
            hours=shift.hours,
            day_type=dt,
            is_holiday=is_hol,
            override_base_rate=req.base_hourly_rate,
            override_is_casual=req.is_casual,
            override_section_name=category_name
        )
        
        # Add allowances per shift instance
        shift_total = result["day_cost"] + daily_allowances_cost
        
        weekly_gross += shift_total * shift.count

    weekly_gross += weekly_extras
    return weekly_gross

def update_role_history(session: Session, role_name: str, base_rate: float, unit: str, project_id: str):
    """
    Update or create RoleHistory entry for auto-learning.
    """
    if not role_name: 
        return
        
    # Search for existing
    role = session.exec(select(RoleHistory).where(RoleHistory.role_name == role_name)).first()
    
    if role:
        # Update
        role.base_rate = base_rate
        role.unit = unit
        role.last_used_at = datetime.utcnow()
        role.usage_count += 1
        role.project_id = project_id # Update recent project context
        session.add(role)
    else:
        # Create
        new_role = RoleHistory(
            role_name=role_name,
            base_rate=base_rate,
            unit=unit,
            project_id=project_id,
            usage_count=1
        )
        session.add(new_role)

def load_fringe_settings() -> FringeSettings:
    defaults = {
        "superannuation": 11.5,
        "holiday_pay": 4.0,
        "payroll_tax": 4.85,
        "workers_comp": 1.5,
        "contingency": 10.0
    }
    if os.path.exists(FRINGE_SETTINGS_FILE):
        try:
            with open(FRINGE_SETTINGS_FILE, 'r') as f:
                data = json.load(f)
                return FringeSettings(**{**defaults, **data})
        except Exception:
            pass
    return FringeSettings(**defaults)

def save_fringe_settings(settings: FringeSettings):
    with open(FRINGE_SETTINGS_FILE, 'w') as f:
        json.dump(settings.model_dump(), f, indent=4)

# --- API Endpoints ---

@app.get("/api/projects")
def get_projects(session: Session = Depends(get_session)):
    projects = session.exec(select(Project)).all()
    # Create default project if none exists (MVP helper)
    if not projects:
        default_p = Project(name="ShortKings Demo Project", client="Internal")
        session.add(default_p)
        session.commit()
        session.refresh(default_p)
        
        # Also create a default Budget
        default_b = Budget(name="v1.0", project_id=default_p.id)
        session.add(default_b)
        session.commit()
        return [default_p]
        
    return projects

class ProjectCreate(BaseModel):
    name: str
    client: Optional[str] = None
    template_id: Optional[str] = None

@app.post("/api/projects")
def create_project(project: ProjectCreate, session: Session = Depends(get_session)):
    new_project = Project(name=project.name, client=project.client)
    session.add(new_project)
    session.commit()
    session.refresh(new_project)
    
    # Logic: If template_id provided, clone it. Else create default.
    if project.template_id:
        from template_router import clone_structure_to_budget
        
        # 1. Create a container budget linked to this project
        # Note: clone_structure_to_budget creates the budget itself usually? 
        # Checking template_router logic... it creates a budget.
        # But we want to ensure it's linked to this project properly.
        
        # Actually template_router.initialize_budget creates a budget.
        # clone_structure_to_budget is a helper that *fills* a budget.
        
        # Let's verify template_router imports.
        # It seems main.py doesn't import template_router yet? 
        # Or maybe it does. Let's assume we can grab the logic or call helper.
        
        # To avoid circular imports if template_router imports models/session,
        # we might need to inline the cloning logic or ensure clean separation.
        # Better: Reuse the `initialize_budget` logic concept here.
        
        # Fetch template
        template = session.get(BudgetTemplate, project.template_id)
        if template:
            # Create new budget
            new_budget = Budget(name="v1.0 From Template", project_id=new_project.id)
            session.add(new_budget)
            session.commit()
            session.refresh(new_budget)
            
            # Clone structure
            if template.snapshot:
                # We need the cloning function. 
                # Ideally this is in a shared service module. 
                # For now, to minimize risk, I will query template_router via import inside function
                try:
                    from template_router import clone_structure_to_budget
                    clone_structure_to_budget(session, new_budget.id, template.snapshot, reset_quantities=True) # Defaulting reset to True for new projects
                except ImportError:
                     # Fallback or error logging
                     print("Could not import clone_structure_to_budget")
        else:
            # Template not found, fallback to default
            default_budget = Budget(name="v1.0 (Template Not Found)", project_id=new_project.id)
            session.add(default_budget)
            session.commit()
    else:
        # Default empty/seeded budget
        default_budget = Budget(name="v1.0", project_id=new_project.id)
        session.add(default_budget)
        session.commit()
    
    return new_project

class ProjectPhaseInput(BaseModel):
    name: str # Main Shoot
    type: str = "SHOOT" 
    start_date: str
    end_date: str

@app.post("/api/projects/{project_id}/phases")
def add_project_phase(project_id: str, phase_data: ProjectPhaseInput, session: Session = Depends(get_session)):
    try:
         # Check dates
        from datetime import datetime
        start = datetime.fromisoformat(phase_data.start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(phase_data.end_date.replace('Z', '+00:00'))
        
        phase = ProjectPhase(
            project_id=project_id,
            name=phase_data.name,
            type=phase_data.type,
            start_date=start,
            end_date=end
        )
        session.add(phase)
        session.commit()
        session.refresh(phase)
        return phase
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/projects/{project_id}/phases")
def get_project_phases(project_id: str, session: Session = Depends(get_session)):
    phases = session.exec(select(ProjectPhase).where(ProjectPhase.project_id == project_id)).all()
    return phases
    
@app.delete("/api/projects/phases/{phase_id}")
def delete_project_phase(phase_id: str, session: Session = Depends(get_session)):
    phase = session.get(ProjectPhase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    session.delete(phase)
    session.commit()
    return {"status": "deleted"}

# --- Production Calendar Endpoints ---

class PhaseConfig(BaseModel):
    defaultHours: float
    dates: List[str]  # ISO date strings

class ProductionCalendarInput(BaseModel):
    phases: Dict[str, PhaseConfig]  # {"preProd": {...}, "shoot": {...}, "postProd": {...}}

@app.post("/api/projects/{project_id}/calendar")
def create_or_update_production_calendar(
    project_id: str,
    calendar_data: ProductionCalendarInput,
    session: Session = Depends(get_session)
):
    """
    Create or update production calendar for a project.
    Auto-detects NSW public holidays.
    """
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete existing calendar for this project
    existing_calendars = session.exec(
        select(ProductionCalendar).where(ProductionCalendar.project_id == project_id)
    ).all()
    for cal in existing_calendars:
        session.delete(cal)
    session.commit()
    
    # Parse all dates to find range for holiday lookup
    all_dates = []
    for phase_name, phase_config in calendar_data.phases.items():
        for date_str in phase_config.dates:
            try:
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '')).date()
                all_dates.append(parsed_date)
            except Exception:
                pass
    
    if not all_dates:
        raise HTTPException(status_code=400, detail="No valid dates provided")
    
    min_date = min(all_dates)
    max_date = max(all_dates)
    
    # Fetch holidays in range
    holiday_service = get_holiday_service()
    holidays = holiday_service.get_holidays_in_range(min_date, max_date)
    holiday_dates = {h['date_obj']: h['name'] for h in holidays}
    
    # Create calendar entries for each phase
    phase_mapping = {
        'preProd': 'PRE_PROD',
        'shoot': 'SHOOT',
        'postProd': 'POST_PROD'
    }
    
    for phase_key, phase_config in calendar_data.phases.items():
        phase_name = phase_mapping.get(phase_key, phase_key.upper())
        
        # Create ProductionCalendar entry
        prod_calendar = ProductionCalendar(
            project_id=project_id,
            phase=phase_name,
            default_hours=phase_config.defaultHours
        )
        session.add(prod_calendar)
        session.flush()  # Get ID for calendar_days
        
        # Create CalendarDay entries
        for date_str in phase_config.dates:
            try:
                day_date = datetime.fromisoformat(date_str.replace('Z', ''))
                day_date_only = day_date.date()
                
                # Determine day type
                day_of_week = day_date_only.weekday()  # 0=Monday, 6=Sunday
                is_weekend = day_of_week >= 5
                is_holiday = day_date_only in holiday_dates
                
                if is_holiday:
                    day_type = 'HOLIDAY'
                elif is_weekend:
                    day_type = 'WEEKEND'
                else:
                    day_type = 'WEEKDAY'
                
                calendar_day = CalendarDay(
                    calendar_id=prod_calendar.id,
                    date=day_date,
                    phase=phase_name,
                    day_type=day_type,
                    is_holiday=is_holiday,
                    holiday_name=holiday_dates.get(day_date_only)
                )
                session.add(calendar_day)
            except Exception as e:
                print(f"Error parsing date {date_str}: {e}")
                continue
    
    session.commit()
    
    # --- Bulk Recalculate Labor Costs ---
    try:
        # Find all LineItems linked to this project via Budget -> Category -> Grouping (Slow but correct)
        # Or simplistic assumption: if we have project_id, we can find items if we join tables.
        # But our LineItem doesn't store project_id directly, it stores grouping_id.
        # However, calculate_labor_cost requires project_id.
        # So we can iterate all budgets for this project?
        
        budgets = session.exec(select(Budget).where(Budget.project_id == project_id)).all()
        fringe_settings = load_fringe_settings()
        
        count_updated = 0
        
        for budget in budgets:
            cats = session.exec(select(BudgetCategory).where(BudgetCategory.budget_id == budget.id)).all()
            for cat in cats:
                # Artist detection: Category E is specifically Artists per pay_rules_reference.md
                is_artist_category = cat.code == "E"
                
                grps = session.exec(select(BudgetGrouping).where(BudgetGrouping.category_id == cat.id)).all()
                for grp in grps:
                    items = session.exec(select(LineItem).where(LineItem.grouping_id == grp.id)).all()
                    for item in items:
                        # 1. Handle Labor Items (Full Recalculation)
                        if item.is_labor:
                            # Re-construct Request with hierarchical awareness
                            hourly_rate = item.base_hourly_rate
                            if not hourly_rate or hourly_rate == 0:
                                hourly_rate = item.rate

                            req = LaborCostRequest(
                                line_item_id=item.id,
                                base_hourly_rate=hourly_rate,
                                is_casual=item.is_casual,
                                is_artist=is_artist_category, 
                                calendar_mode=item.calendar_mode or "inherit",
                                project_id=project_id,
                                grouping_id=grp.id,
                                phase_details=item.phase_details or {}
                            )
                            
                            try:
                                res = calculate_labor_cost(session, req, fringe_settings)
                                
                                # Update Item
                                item.total = res.total_cost + res.fringes.get("total_fringes", 0)
                                item.breakdown_json = json.dumps(res.breakdown)
                                item.fringes_json = json.dumps(res.fringes)
                                
                                # Update quantities for display
                                if 'preProd' in res.breakdown: item.prep_qty = float(res.breakdown['preProd']['days'])
                                if 'shoot' in res.breakdown: item.shoot_qty = float(res.breakdown['shoot']['days'])
                                if 'postProd' in res.breakdown: item.post_qty = float(res.breakdown['postProd']['days'])
                                item.quantity = item.prep_qty + item.shoot_qty + item.post_qty
                                
                                session.add(item)
                                count_updated += 1
                            except Exception as e:
                                print(f"Failed to auto-recalc labor item {item.id}: {e}")
                                continue
                                
                        # 2. Handle Material Items (Quantity Sync)
                        elif item.unit in ["day", "week"]:
                            # Material lines also need to sync quantities if they depend on calendar
                            # We can use a simplified version of calendar resolution or just reuse calculate_labor_cost 
                            # but that's overkill. Let's just pull the effective calendar dates.
                            
                            # For MVP, we'll use the LaborCostRequest/Service just to get the corrected day counts
                            # but ignore the cost output.
                            req = LaborCostRequest(
                                line_item_id=item.id,
                                base_hourly_rate=0,
                                is_casual=False,
                                is_artist=False,
                                calendar_mode=item.calendar_mode or "inherit",
                                project_id=project_id,
                                grouping_id=grp.id,
                                phase_details=item.phase_details or {}
                            )
                            
                            try:
                                res = calculate_labor_cost(session, req, fringe_settings)
                                
                                # Extract days
                                pre_days = float(res.breakdown.get('preProd', {}).get('days', 0))
                                shoot_days = float(res.breakdown.get('shoot', {}).get('days', 0))
                                post_days = float(res.breakdown.get('postProd', {}).get('days', 0))
                                
                                item.prep_qty = pre_days
                                item.shoot_qty = shoot_days
                                item.post_qty = post_days
                                
                                # Construct Breakdown for Material (Unified Structure)
                                # We store preProd/shoot/postProd to match backend standard
                                mat_breakdown = {
                                    "preProd": {"days": pre_days, "cost": pre_days * item.rate},
                                    "shoot": {"days": shoot_days, "cost": shoot_days * item.rate},
                                    "postProd": {"days": post_days, "cost": post_days * item.rate}
                                }
                                item.breakdown_json = json.dumps(mat_breakdown)
                                
                                # Recalculate Total
                                if item.unit == "day":
                                    item.quantity = item.prep_qty + item.shoot_qty + item.post_qty
                                    item.total = item.rate * item.quantity
                                elif item.unit == "week":
                                    # Use pro-rata weeks based on days_per_week (default 5)
                                    days_per_week = item.days_per_week if item.days_per_week > 0 else 5.0
                                    item.quantity = (item.prep_qty + item.shoot_qty + item.post_qty) / days_per_week
                                    item.total = item.rate * item.quantity
                                
                                session.add(item)
                                count_updated += 1
                            except Exception as e:
                                print(f"Failed to sync material item {item.id}: {e}")
                                continue

        session.commit()
        print(f"Bulk Recalculation Complete: Updated {count_updated} items.")
        
    except Exception as e:
        print(f"Error during bulk recalculation: {e}")
        # Don't fail the request, just log it.

    return {"status": "success", "message": "Production calendar updated and budget recalculated"}

@app.get("/api/holidays")
def get_holidays(year: Optional[int] = None, state: str = "NSW"):
    """Get public holidays for a year/state"""
    holiday_service = get_holiday_service()
    if year:
        start = date(year, 1, 1)
        end = date(year, 12, 31)
    else:
        # Default to current + next year
        start = date.today()
        end = date(start.year + 1, 12, 31)
    
    holidays = holiday_service.get_holidays_in_range(start, end)
    return [{"date": h['date'], "name": h['name']} for h in holidays]

@app.get("/api/projects/{project_id}/calendar")
def get_production_calendar(
    project_id: str,
    session: Session = Depends(get_session)
):
    """
    Get production calendar for a project with all days and holiday info.
    """
    # Get all calendar entries
    calendars = session.exec(
        select(ProductionCalendar).where(ProductionCalendar.project_id == project_id)
    ).all()
    
    holiday_service = get_holiday_service()
    
    if not calendars:
        # Return holidays for 2026 as a default context
        holidays = holiday_service.get_holidays_in_range(date(2026, 1, 1), date(2026, 12, 31))
        return {
            "phases": {},
            "holidays": [{"date": h['date'], "name": h['name']} for h in holidays],
            "calendarDays": []
        }
    
    # Build response
    phases = {}
    all_calendar_days = []
    min_date = None
    max_date = None
    
    for cal in calendars:
        phase_key = cal.phase.lower().replace('_', '')
        if cal.phase == 'PRE_PROD':
            phase_key = 'preProd'
        elif cal.phase == 'POST_PROD':
            phase_key = 'postProd'
        
        # Get days for this phase
        days = session.exec(
            select(CalendarDay).where(CalendarDay.calendar_id == cal.id)
        ).all()
        
        phases[phase_key] = {
            "defaultHours": cal.default_hours,
            "dates": [d.date.isoformat() for d in days]
        }
        
        # Add to all calendar days
        for day in days:
            d_obj = day.date.date()
            if min_date is None or d_obj < min_date: min_date = d_obj
            if max_date is None or d_obj > max_date: max_date = d_obj
            
            all_calendar_days.append({
                "date": day.date.isoformat(),
                "phase": day.phase,
                "dayType": day.day_type,
                "isHoliday": day.is_holiday,
                "holidayName": day.holiday_name,
                "defaultHours": cal.default_hours
            })
    
    # Always fetch fresh holidays for the detected range to ensure UI is accurate
    # even if saved data was missing them initially
    holidays = []
    if min_date and max_date:
        # Broaden to full years to ensure scrolling shows holidays
        fresh_holidays = holiday_service.get_holidays_in_range(
            date(min_date.year, 1, 1), 
            date(max_date.year, 12, 31)
        )
        # Normalize date format to ISO YYYY-MM-DD
        holidays = [{"date": h['date_obj'].isoformat(), "name": h['name']} for h in fresh_holidays]
    else:
        # Fallback to current year (2026 for this project)
        fresh_holidays = holiday_service.get_holidays_in_range(date(2026, 1, 1), date(2026, 12, 31))
        holidays = [{"date": h['date_obj'].isoformat(), "name": h['name']} for h in fresh_holidays]
    
    return {
        "phases": phases,
        "holidays": holidays,
        "calendarDays": all_calendar_days
    }

# --- Labor & Material Calculation Integration ---
from labor_calculator_service import calculate_labor_cost, LaborCostRequest, LaborCostResponse

@app.post("/api/calculate-labor-cost", response_model=LaborCostResponse)
def calculate_labor_cost_endpoint(
    req: LaborCostRequest,
    session: Session = Depends(get_session)
):
    """
    Calculate labor cost with full calendar integration and pay rules.
    """
    fringe_settings = load_fringe_settings()
    
    # Delegate to service
    try:
        result = calculate_labor_cost(session, req, fringe_settings)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class ScheduleCostRequest(BaseModel):
    classification: str
    assignedDays: List[str]  # ISO date strings
    projectId: str

@app.post("/api/calculate-schedule-cost")
def calculate_schedule_cost(
    req: ScheduleCostRequest,
    session: Session = Depends(get_session)
):
    """
    Calculate cost for a labor schedule using real payguide rates.
    LEGACY/SIMPLE MODE - Kept for backward compatibility or simple tools
    """
    # Get calendar days for the assigned dates
    assigned_day_objs = []
    for date_str in req.assignedDays:
        try:
            parsed_date = datetime.fromisoformat(date_str.replace('Z', ''))
            # Find this day in calendar
            day = session.exec(
                select(CalendarDay).where(
                    CalendarDay.date == parsed_date
                )
            ).first()
            
            if day:
                assigned_day_objs.append(day)
        except Exception:
            continue
    
    if not assigned_day_objs:
        return {
            "total_cost": 0,
            "total_days": 0,
            "total_hours": 0,
            "breakdown": {
                "weekday": {"days": 0, "cost": 0},
                "weekend": {"days": 0, "cost": 0},
                "holiday": {"days": 0, "cost": 0}
            },
            "daily_details": [],
            "warning": "No calendar days found for assigned dates"
        }
    
    # Use rate lookup service
    rate_service = get_rate_service()
    
    weekday_days = []
    weekend_days = []
    holiday_days = []
    daily_details = []
    
    for day in assigned_day_objs:
        # Get calendar to find default hours
        calendar = session.get(ProductionCalendar, day.calendar_id)
        hours = calendar.default_hours if calendar else 8.0
        
        # Refine day type for rate service (needs SATURDAY/SUNDAY, not just WEEKEND)
        calc_day_type = day.day_type
        if day.day_type == 'WEEKEND':
            wd = day.date.weekday()
            if wd == 5: 
                calc_day_type = 'SATURDAY'
            elif wd == 6: 
                calc_day_type = 'SUNDAY'

        # Get rate from payguide
        rate_info = rate_service.calculate_day_cost(
            classification=req.classification,
            hours=hours,
            day_type=calc_day_type,
            is_holiday=day.is_holiday
        )
        
        detail = {
            "date": day.date.isoformat(),
            "hours": hours,
            "hourly_rate": rate_info.get("base_hourly", 0),
            "day_cost": rate_info["day_cost"],
            "day_type": day.day_type,
            "is_holiday": day.is_holiday,
            "rate_type": rate_info.get("rate_type", "Standard"),
            "rate_multiplier": rate_info.get("rate_multiplier", 1.0),
            "base_hourly": rate_info.get("base_hourly", 0),
            "source": rate_info.get("source", "Unknown")
        }
        daily_details.append(detail)
        
    # Summarize
    total_cost = sum(d["day_cost"] for d in daily_details)
    
    return {
        "total_cost": total_cost,
        "total_days": len(assigned_day_objs), # Count of VALID days found
        "total_hours": sum(d["hours"] for d in daily_details),
        "breakdown": {
            # Legacy breakdown structure if needed
        },
        "daily_details": daily_details
    }

# --- Project Summary Endpoint ---

class DepartmentBreakdown(BaseModel):
    id: Optional[str] = None
    name: str
    total: float
    percentage: float

class PhaseBreakdown(BaseModel):
    name: str
    total: float
    percentage: float

class ProjectSummaryResponse(BaseModel):
    total_cost: float
    department_breakdown: List[DepartmentBreakdown]
    phase_breakdown: List[PhaseBreakdown]

@app.get("/api/projects/{project_id}/summary", response_model=ProjectSummaryResponse)
def get_project_summary(project_id: str, session: Session = Depends(get_session)):
    """
    Get financial summary for the project including department and phase breakdowns.
    """
    # 1. Fetch all budgets for project
    budgets = session.exec(select(Budget).where(Budget.project_id == project_id)).all()
    
    total_cost = 0.0
    # Map name -> { total: float, id: str }
    dept_map = {} 
    phase_map = { "Pre-Production": 0.0, "Shoot": 0.0, "Post-Production": 0.0, "Other": 0.0 }
    
    for budget in budgets:
        # Fetch categories
        cats = session.exec(select(BudgetCategory).where(BudgetCategory.budget_id == budget.id)).all()
        for cat in cats:
            cat_total = 0.0
            
            # Fetch groupings
            grps = session.exec(select(BudgetGrouping).where(BudgetGrouping.category_id == cat.id)).all()
            for grp in grps:
                # Fetch items
                items = session.exec(select(LineItem).where(LineItem.grouping_id == grp.id)).all()
                for item in items:
                    item_total = item.total or 0.0
                    cat_total += item_total
                    
                    # Phase Breakdown
                    if item.breakdown_json:
                        try:
                            bk = json.loads(item.breakdown_json)
                            # Standard keys: preProd, shoot, postProd
                            if "preProd" in bk: phase_map["Pre-Production"] += float(bk["preProd"].get("cost", 0) or 0)
                            if "shoot" in bk: phase_map["Shoot"] += float(bk["shoot"].get("cost", 0) or 0)
                            if "postProd" in bk: phase_map["Post-Production"] += float(bk["postProd"].get("cost", 0) or 0)
                            # Handle leftovers?
                        except:
                            phase_map["Other"] += item_total
                    else:
                        phase_map["Other"] += item_total

            # Aggregate by name, but capture ID. 
            # If multiple categories have same name (e.g. across versions), we keep the first/last ID encountered.
            current = dept_map.get(cat.name, { "total": 0.0, "id": cat.id })
            current["total"] += cat_total
            # Update ID if not set (though we default above) or maybe prefer the one with data?
            # For now, just keeping the ID of the category as we iterate is sufficient for linking.
            # Ideally we want the ID from the "latest" budget or similar, but this works for single-budget projects.
            if not current.get("id"):
                current["id"] = cat.id
                
            dept_map[cat.name] = current
            total_cost += cat_total

    # Cleanup format
    depts = []
    for name, data in dept_map.items():
        amount = data["total"]
        pct = (amount / total_cost * 100) if total_cost > 0 else 0
        depts.append(DepartmentBreakdown(
            id=data["id"],
            name=name, 
            total=amount, 
            percentage=pct
        ))
    
    # Sort by amount desc
    depts.sort(key=lambda x: x.total, reverse=True)
    
    phases = []
    for name, amount in phase_map.items():
        if amount > 0:
            pct = (amount / total_cost * 100) if total_cost > 0 else 0
            phases.append(PhaseBreakdown(name=name, total=amount, percentage=pct))

    return ProjectSummaryResponse(
        total_cost=total_cost,
        department_breakdown=depts,
        phase_breakdown=phases
    )

@app.get("/api/rates/search")
def search_rates(q: str, limit: int = 20):
    """
    Search for labor classifications.
    Returns unique keys to be used in cost calculation.
    """
    if not q:
        return []
    
    rate_service = get_rate_service()
    return rate_service.search_classifications(q, limit)

def _build_budget_response(session: Session, budget_id: str):
    cats = session.exec(select(BudgetCategory).where(BudgetCategory.budget_id == budget_id).order_by(BudgetCategory.sort_order)).all()
    
    result = []
    for cat in cats:
        cat_dict = cat.model_dump()
        
        grps = session.exec(select(BudgetGrouping).where(BudgetGrouping.category_id == cat.id)).all()
        cat_dict['groupings'] = []
        
        total_cat = 0
        for grp in grps:
            grp_dict = grp.model_dump()
            items = session.exec(select(LineItem).where(LineItem.grouping_id == grp.id)).all()
            grp_dict['items'] = [i.model_dump() for i in items]
            
            sub_total = sum(i.total for i in items)
            grp_dict['sub_total'] = sub_total
            total_cat += sub_total
            cat_dict['groupings'].append(grp_dict)
            
        cat_dict['total'] = total_cat
        result.append(cat_dict)
        
    return result

@app.get("/api/budgets/{budget_id}")
def get_budget(budget_id: str, session: Session = Depends(get_session)):
    budget = session.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return _build_budget_response(session, budget_id)

@app.get("/api/projects/{project_id}/budget")
def get_project_budget(project_id: str, session: Session = Depends(get_session)):
    # Find budget for project (assuming single budget for now)
    budget = session.exec(select(Budget).where(Budget.project_id == project_id)).first()
    if not budget:
        # Auto-create if project exists but no budget?
        # Check project exists
        p = session.get(Project, project_id)
        if not p:
             raise HTTPException(status_code=404, detail="Project not found")
             
        budget = Budget(name="v1.0", project_id=project_id)
        session.add(budget)
        session.commit()
        session.refresh(budget)
        
        # Seed logic (reused from get_default_budget or shared)
        # For DRY, let's just rely on _build_budget_response returning empty structure 
        # or maybe we should seed it?
        # Let's seed it.
        cats = [
                ("A", "Above The Line"),
                ("B", "Producers & Staff"),
                ("C", "Production Crew"),
                ("D", "Equipment"),
                ("E", "Travel & Transport"),
        ]
        
        for i, (code, name) in enumerate(cats):
            c = BudgetCategory(code=code, name=name, budget_id=budget.id, sort_order=i)
            session.add(c)
            session.commit()
            if code == "A":
                session.add(BudgetGrouping(code="A.1", name="Story & Rights", category_id=c.id))
            elif code == "B":
                session.add(BudgetGrouping(code="B.1", name="Producers", category_id=c.id))
        session.commit()

    return _build_budget_response(session, budget.id)

class BudgetGroupingUpdate(BaseModel):
    name: Optional[str] = None
    calendar_overrides: Optional[Dict] = None

@app.patch("/api/budget/groupings/{grouping_id}")
def update_grouping(grouping_id: str, updates: BudgetGroupingUpdate, session: Session = Depends(get_session)):
    grp = session.get(BudgetGrouping, grouping_id)
    if not grp:
        raise HTTPException(status_code=404, detail="Grouping not found")
    
    if updates.name is not None:
        grp.name = updates.name
    if updates.calendar_overrides is not None:
        grp.calendar_overrides = updates.calendar_overrides
        
    session.add(grp)
    session.commit()
    session.refresh(grp)
    return grp

class BudgetSaveRequest(BaseModel):
    categories: List[Dict[str, Any]]
    deleted_item_ids: List[str] = []
    deleted_grouping_ids: List[str] = []
    deleted_category_ids: List[str] = []

@app.post("/api/budget")
def save_budget(req: BudgetSaveRequest, session: Session = Depends(get_session)):
    """
    Save the full budget tree with explicit handling for deletions.
    """
    try:
        # 1. Process Deletions First
        if req.deleted_item_ids:
            for item_id in req.deleted_item_ids:
                item = session.get(LineItem, item_id)
                if item:
                    session.delete(item)
        
        if req.deleted_grouping_ids:
            for grp_id in req.deleted_grouping_ids:
                grp = session.get(BudgetGrouping, grp_id)
                if grp:
                    session.delete(grp)
                    
        if req.deleted_category_ids:
            for cat_id in req.deleted_category_ids:
                cat = session.get(BudgetCategory, cat_id)
                if cat:
                    session.delete(cat)
                    
        # Flush deletions
        session.flush()

        # 2. Process Upserts (Updates & Inserts)
        for cat_data in req.categories:
            # Update Category
            db_cat = None
            cat_id = cat_data.get("id")
            if cat_id:
                db_cat = session.get(BudgetCategory, cat_id)
                if db_cat:
                    db_cat.name = cat_data.get("name", db_cat.name)
                # If passed an ID that doesn't exist, we skip or handle? 
                # For now assume sync is correct or it was a deletion.
                if db_cat:
                    session.add(db_cat)
            
            # Update Groupings
            for grp_data in cat_data.get("groupings", []):
                db_grp = None
                grp_id = grp_data.get("id")
                if grp_id:
                    db_grp = session.get(BudgetGrouping, grp_id)
                    if db_grp:
                        db_grp.name = grp_data.get("name", db_grp.name)
                        # Persist valid overrides if present
                        if "calendar_overrides" in grp_data:
                            db_grp.calendar_overrides = grp_data["calendar_overrides"]
                    if db_grp:
                        session.add(db_grp)
                
                # Update Items
                for item_data in grp_data.get("items", []):
                    item_id = item_data.get("id")
                    
                    db_item = None
                    if item_id:
                        db_item = session.get(LineItem, item_id)
                    
                    # If not found, Create New
                    if not db_item and grp_id and db_grp: # Ensure we have a parent grouping
                        # If item_id is missing/empty, generate new
                        new_id = item_id if item_id else str(uuid.uuid4())
                        db_item = LineItem(id=new_id, grouping_id=grp_id)
                        session.add(db_item)

                    if db_item:
                        # Update fields
                        db_item.description = item_data.get("description", db_item.description)
                        db_item.rate = float(item_data.get("rate", 0))
                        db_item.quantity = (float(item_data.get("prep_qty", 0)) + 
                                          float(item_data.get("shoot_qty", 0)) + 
                                          float(item_data.get("post_qty", 0)))
                        db_item.total = float(item_data.get("total", 0))
                        db_item.is_labor = bool(item_data.get("is_labor", False))
                        db_item.notes = item_data.get("notes", None)
                        
                        # Persist Quantities
                        db_item.prep_qty = float(item_data.get("prep_qty", 0))
                        db_item.shoot_qty = float(item_data.get("shoot_qty", 0))
                        db_item.post_qty = float(item_data.get("post_qty", 0))
                        
                        # Labor specific
                        db_item.base_hourly_rate = float(item_data.get("base_hourly_rate", 0))
                        db_item.daily_hours = float(item_data.get("daily_hours", 0))
                        db_item.days_per_week = float(item_data.get("days_per_week", 0))
                        db_item.is_casual = bool(item_data.get("is_casual", False))
                        
                        # V2 New Fields Persistence
                        db_item.calendar_mode = item_data.get("calendar_mode", "inherit")
                        db_item.phase_details = item_data.get("phase_details", {})
                        db_item.labor_phases_json = item_data.get("labor_phases_json", "[]") # Expect string from FE
                        db_item.award_classification_id = item_data.get("award_classification_id")
                        db_item.role_history_id = item_data.get("role_history_id")
                        
                        # Fix for Unit Reset Issue
                        db_item.unit = item_data.get("unit", db_item.unit or "day")
                        
                        # Persist Calculation Details
                        db_item.breakdown_json = item_data.get("breakdown_json", None)
                        db_item.fringes_json = item_data.get("fringes_json", None)
                        
                        # Handle json lists safe retrieval
                        if "allowances" in item_data and isinstance(item_data["allowances"], list):
                             db_item.allowances_json = json.dumps(item_data["allowances"])
                        else:
                             db_item.allowances_json = item_data.get("allowances_json", "[]")

                        session.add(db_item)
                        
                        # Labor V2: Learn Role History
                        if db_item.is_labor and db_item.description:
                            try:
                                update_role_history(
                                    session, 
                                    db_item.description, 
                                    db_item.base_hourly_rate if db_item.base_hourly_rate > 0 else db_item.rate,
                                    db_item.unit,
                                    db_item.grouping.category.budget.project_id if db_item.grouping and db_item.grouping.category and db_item.grouping.category.budget else "unknown"
                                )
                            except:
                                pass # Don't block save on history update failure
        
        session.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok"}

@app.post("/api/budget/items")
def add_line_item(item: LineItemBase, session: Session = Depends(get_session)):
    # Create new item
    db_item = LineItem.model_validate(item)
    
    # Calculate total: check for Phased Labor first
    if db_item.labor_phases_json and len(db_item.labor_phases_json) > 2:
        try:
            phases = json.loads(db_item.labor_phases_json)
            # Sum the total_cost of each phase
            phase_total = sum(float(p.get('total_cost', 0)) for p in phases)
            if phase_total > 0:
                db_item.total = phase_total
            else:
                db_item.total = db_item.rate * db_item.quantity
        except Exception as e:
            print(f"Error parsing labor phases: {e}")
            db_item.total = db_item.rate * db_item.quantity
    else:
        db_item.total = db_item.rate * db_item.quantity
    
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@app.delete("/api/budget/items/{item_id}")
def delete_line_item(item_id: str, session: Session = Depends(get_session)):
    item = session.get(LineItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    session.delete(item)
    session.commit()
    return {"status": "deleted"}

@app.post("/api/calculate-labor")
def calculate_labor(req: LaborCalcRequest):
    weekly_rate = calculate_weekly_labor_rate(req)
    
    # Calculate Fringes
    settings = load_fringe_settings()
    
    # Simple logic: Fringes on top of Gross Weekly
    # Note: In reality, some fringes might apply to Base only, but sticking to Gross for MVP efficiency
    fringes = {
        "super": round(weekly_rate * (settings.superannuation / 100.0), 2),
        "payroll_tax": round(weekly_rate * (settings.payroll_tax / 100.0), 2),
        "workers_comp": round(weekly_rate * (settings.workers_comp / 100.0), 2),
        "holiday_pay": round(weekly_rate * (settings.holiday_pay / 100.0), 2),
    }
    fringes["total_fringes"] = sum(fringes.values())
    
    return {
        "weekly_rate": weekly_rate,
        "fringes": fringes
    }

@app.get("/api/settings")
def get_settings():
    return load_fringe_settings()

@app.post("/api/settings")
def update_settings_endpoint(settings: FringeSettings = Body(...)):
    save_fringe_settings(settings)
    return settings

# Removed duplicate search_rates


@app.get("/api/catalog")
def get_catalog(session: Session = Depends(get_session)):
    # 1. From DB (existing items utilized)
    # For MVP, maybe just return Labor Catalog
    catalog = {}
    
    # 2. From Rates File
    if os.path.exists(RATES_FILE):
        with open(RATES_FILE, "r") as f:
            raw_rates = json.load(f)
            
        for award_name, types in raw_rates.items():
            for emp_type, levels in types.items():
                for level_name, rates_data in levels.items():
                    # Construct a descriptive name for the labor role
                    description = f"{award_name.replace('_', ' ').title()} - {emp_type.replace('_', ' ').title()} - {level_name}"
                    if description not in catalog:
                        catalog[description] = CatalogItem(
                            description=description,
                            default_rate=rates_data.get("base", 0), # Use base rate as default
                            default_category_id="LABOR", 
                            default_category_name="Labor Rates",
                            is_labor=True
                        )
    return list(catalog.values())

@app.get("/api/roles/search")
def search_roles(q: str, limit: int = 10, session: Session = Depends(get_session)):
    """
    Fuzzy search RoleHistory for auto-complete.
    Priority: Higher usage count + Recent usage
    """
    if not q:
        return []
        
    roles = session.exec(
        select(RoleHistory)
        .where(RoleHistory.role_name.ilike(f"%{q}%"))
        .order_by(RoleHistory.usage_count.desc(), RoleHistory.last_used_at.desc())
        .limit(limit)
    ).all()
    
    return roles

def _calculate_budget_summary(session: Session, budget_id: str):
    # Calculate simple summary
    items = session.exec(select(LineItem).join(BudgetGrouping).join(BudgetCategory).where(BudgetCategory.budget_id == budget_id)).all()
    
    total = sum(i.total for i in items)
    # Placeholder for sophisticated calc logic
    return {
        "grand_total": total,
        "atl_total": 0, # Need to filter by Category Code "A", "B"
        "btl_total": total,
        "fringes_total": 0,
        "contingency_total": 0,
        "fringe_breakdown": {}
    }

@app.get("/api/summary/{budget_id}")
def get_summary(budget_id: str, session: Session = Depends(get_session)):
    return _calculate_budget_summary(session, budget_id)

@app.get("/api/summary")
def get_default_summary(session: Session = Depends(get_session)):
    budget = session.exec(select(Budget)).first()
    if not budget:
        return {
            "grand_total": 0,
            "atl_total": 0,
            "btl_total": 0,
            "fringes_total": 0,
            "contingency_total": 0,
            "fringe_breakdown": {}
        }
    return _calculate_budget_summary(session, budget.id)

if __name__ == "__main__":
    import uvicorn
    # Use import string to allow reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# Reload
