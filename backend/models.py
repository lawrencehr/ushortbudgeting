from typing import Optional, List, Dict, Any
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
from datetime import datetime
import uuid

# --- Shared Enums/types ---

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ProjectBase(SQLModel):
    name: str = Field(index=True)
    client: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectPhase(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="project.id")
    name: str # e.g. "Main Block", "Pre-Prod"
    type: str # PREP, SHOOT, POST
    start_date: datetime
    end_date: datetime
    
    project: "Project" = Relationship(back_populates="phases")

class Project(ProjectBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    budgets: List["Budget"] = Relationship(back_populates="project")
    phases: List["ProjectPhase"] = Relationship(back_populates="project")

class BudgetBase(SQLModel):
    name: str
    status: str = "DRAFT" # DRAFT, APPROVED, LOCKED
    total_amount: float = 0.0
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")

class Budget(BudgetBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project: Optional[Project] = Relationship(back_populates="budgets")
    categories: List["BudgetCategory"] = Relationship(back_populates="budget")

class BudgetCategoryBase(SQLModel):
    code: str # A, B, C
    name: str # Above the Line
    budget_id: Optional[str] = Field(default=None, foreign_key="budget.id")
    sort_order: int = 0

class BudgetCategory(BudgetCategoryBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    budget: Optional[Budget] = Relationship(back_populates="categories")
    groupings: List["BudgetGrouping"] = Relationship(back_populates="category")

class BudgetGroupingBase(SQLModel):
    name: str
    code: str
    category_id: Optional[str] = Field(default=None, foreign_key="budgetcategory.id")

class BudgetGrouping(BudgetGroupingBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    category: Optional[BudgetCategory] = Relationship(back_populates="groupings")
    items: List["LineItem"] = Relationship(back_populates="grouping")

class LineItemBase(SQLModel):
    description: str
    rate: float = 0.0
    quantity: float = 0.0 # Total qty (prep + shoot + post)
    prep_qty: float = 0.0
    shoot_qty: float = 0.0
    post_qty: float = 0.0
    unit: str = "day" # day, week, allow
    total: float = 0.0
    is_labor: bool = False
    notes: Optional[str] = None
    
    # Labor specifics
    base_rate: float = 0.0
    days_per_week: float = 5.0
    overtime_rule_set: str = "Standard"
    crew_member_id: Optional[str] = None
    # Store allowances as a JSON string for MVP simplicity in LineItem
    allowances_json: Optional[str] = "[]" 
    # Store phases as JSON string (Prep/Shoot/Post properties)
    labor_phases_json: Optional[str] = "[]"
    
    grouping_id: Optional[str] = Field(default=None, foreign_key="budgetgrouping.id")

class LineItem(LineItemBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    grouping: Optional[BudgetGrouping] = Relationship(back_populates="items")

# --- Crew / API Data Layer ---


class LaborAllowance(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    name: str
    amount: float
    frequency: str = "day" # day, week
    crew_member_id: Optional[str] = Field(default=None, foreign_key="crewmember.id")
    crew_member: Optional["CrewMember"] = Relationship(back_populates="allowances")

class CrewMember(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    name: str = Field(index=True)
    role: str
    base_rate: float
    default_days_per_week: float = 5.0
    overtime_rule_set: str = "Standard" # Standard, 10h Day
    allowances: List[LaborAllowance] = Relationship(back_populates="crew_member")

# --- Production Calendar Models ---

class ProductionCalendar(SQLModel, table=True):
    """Production calendar storing phase configurations"""
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    project_id: str = Field(foreign_key="project.id", index=True)
    phase: str  # 'PRE_PROD', 'SHOOT', 'POST_PROD'
    default_hours: float = 8.0  # Default daily hours for this phase
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    project: Optional[Project] = Relationship()
    calendar_days: List["CalendarDay"] = Relationship(back_populates="calendar")

class CalendarDay(SQLModel, table=True):
    """Individual day in the production calendar"""
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    calendar_id: str = Field(foreign_key="productioncalendar.id", index=True)
    date: datetime  # The actual date
    phase: str  # 'PRE_PROD', 'SHOOT', 'POST_PROD'
    day_type: str  # 'WEEKDAY', 'WEEKEND', 'HOLIDAY'
    is_holiday: bool = False
    holiday_name: Optional[str] = None
    
    calendar: Optional[ProductionCalendar] = Relationship(back_populates="calendar_days")
    schedule_days: List["ScheduleDay"] = Relationship(back_populates="calendar_day")

class LaborSchedule(SQLModel, table=True):
    """Labor schedule assignment for a budget line item"""
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    budget_line_id: str = Field(foreign_key="lineitem.id", index=True)
    phase: str  # 'PRE_PROD', 'SHOOT', 'POST_PROD'
    mode: str  # 'ALL_DAYS', 'SPECIFIC_DAYS', 'NOT_WORKING'
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    budget_line: Optional[LineItem] = Relationship()
    schedule_days: List["ScheduleDay"] = Relationship(back_populates="schedule")

class ScheduleDay(SQLModel, table=True):
    """Specific day assignment within a labor schedule"""
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    schedule_id: str = Field(foreign_key="laborschedule.id", index=True)
    calendar_day_id: str = Field(foreign_key="calendarday.id", index=True)
    hours_override: Optional[float] = None  # Override phase default hours
    
    schedule: Optional[LaborSchedule] = Relationship(back_populates="schedule_days")
    calendar_day: Optional[CalendarDay] = Relationship(back_populates="schedule_days")

# --- Template Models ---

class BudgetTemplate(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=generate_uuid, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    created_by: str = Field(index=True) # User ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source_budget_id: Optional[str] = None
    # Store the full budget structure as a JSON blob
    snapshot: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    item_count: int = 0
    category_count: int = 0

