# Labor & Material Calculation Integration Specification

**Version:** 1.0 DRAFT  
**Date:** 2026-01-29  
**Status:** Pending Design Review

---

## 1. Executive Summary

This document outlines the implementation plan for connecting the backend labor and material calculation engine to the frontend budget interface. The system must support multiple calculation modes (hourly, daily, weekly, flat rate) with hierarchical calendar overrides (global → group → line item) and complex pay rules as defined in `pay_rules_reference.md`.

## 2. Current State Analysis

### 2.1 Backend Components

**Existing:**
- `labor_engine.py`: Generic overtime calculation engine
- `rate_lookup_service.py`: Payguide-based rate lookup with weekend/holiday multipliers
- `models.py`: Database schema with Labor V2 fields (`calendar_mode`, `phase_details`, `calendar_overrides`)
- `main.py`: API endpoints for calendar management and schedule cost calculation
- `labor-context.tsx`: Frontend context for hierarchical calendar settings

**Pay Rules (`pay_rules_reference.md`):**
- Category E (Artists) vs Crew distinction
- Casual loading (25% for Crew, 25% for Artists)
- Overtime thresholds at 7.6h and 9.6h
- Weekend penalties: Saturday (1.5x-2.0x), Sunday (1.75x-2.5x)
- Public holiday rates (2.5x-3.125x)

### 2.2 Frontend Components

**Existing:**
- `BudgetSheet.tsx`: Main budget interface
- `BudgetRow.tsx`: Individual line item display
- `InlineItemEditor.tsx`: New item creation
- `DepartmentSettingsPopover.tsx`: Group-level calendar overrides
- `PhaseOverridePopover.tsx`: Multi-phase calendar picker
- `labor-context.tsx`: Hierarchical calendar state management

### 2.3 Data Models

**LineItem Schema:**
```typescript
{
  description: string
  rate: float
  unit: "hour" | "day" | "week" | "allow" | "flat"
  
  // Phase quantities
  prep_qty: float
  shoot_qty: float
  post_qty: float
  
  // Labor-specific
  is_labor: boolean
  base_hourly_rate: float
  daily_hours: float
  days_per_week: float
  is_casual: boolean
  
  // Calendar hierarchy
  calendar_mode: "inherit" | "custom"
  phase_details: {
    active_phases?: string[]
    preProd?: { hours?: number, dates?: string[] }
    shoot?: { hours?: number, dates?: string[] }
    postProd?: { hours?: number, dates?: string[] }
  }
  
  // Payguide integration
  award_classification_id?: string
  
  total: float
}
```

---

## 3. Calculation Requirements

### 3.1 Labor Line Calculation Modes

#### Mode 1: Hourly Entry
**User Input:**
- Base hourly rate
- Hours per day (from calendar settings)
- Days per phase (from calendar dates)
- Casual toggle

**Calculation Flow:**
1. Resolve calendar hierarchy (line item → group → global)
2. For each active phase (Prep/Shoot/Post):
   - Get working dates from calendar
   - For each date, determine day type (Weekday/Sat/Sun/Holiday)
   - Apply pay rules multipliers from `pay_rules_reference.md`
   - Calculate day cost with overtime bands (0-7.6h, 7.6-9.6h, 9.6h+)
3. Sum all day costs across phases
4. Apply fringes (Super 11.5%, Holiday Pay 4%, Payroll Tax 4.85%, Workers Comp 1.5%)
5. Store breakdown in `fringes_json`

**Edge Cases:**
- Partial days (fractional hours)?
- Mixed day types in single phase?
- Overtime calculation when hours vary by date?

#### Mode 2: Daily Rate Entry
**User Input:**
- Daily rate (flat)
- Days per phase (from calendar dates)
- Casual toggle (already embedded in daily rate?)

**Calculation Flow:**
1. Resolve calendar hierarchy
2. For each active phase:
   - Count working dates
   - Check if any are weekends/holidays
   - Apply weekend penalties ONLY (no overtime, as rate is already daily)
3. **Question:** Do weekend penalties apply to daily rates, or are they "all-in"?

#### Mode 3: Weekly Rate Entry
**User Input:**
- Weekly rate (flat)
- Days working per week (e.g., 5-day week)
- Weeks per phase (calculated from calendar dates)

**Calculation Flow:**
1. Resolve calendar hierarchy
2. For each active phase:
   - Count total working dates
   - Calculate pro-rata weeks: `total_dates / days_per_week`
3. Total = `weekly_rate * pro_rata_weeks`
4. **Question:** How to handle partial weeks? Round up/down or exact pro-rata?

#### Mode 4: Flat Rate Entry
**User Input:**
- Flat fee for entire engagement
- Phase allocation percentages OR automatic pro-rata

**Calculation Flow:**
1. If user specifies allocation: `prep_qty = 30%, shoot_qty = 50%, post_qty = 20%`
2. If auto pro-rata: allocate based on phase duration (working days ratio)
3. Total remains fixed at flat rate
4. **Question:** Do fringes apply to flat rates? Industry standard varies.

### 3.2 Material Line Calculation ✅ UPDATED

**Modes:**
- **Per-Day:** Rate × days from calendar (e.g., $500/day equipment rental)
- **Per-Week:** Rate × (total days ÷ days_per_week) (e.g., $1500/week camera package)
- **Flat Fee:** Fixed cost, allocated to phases (e.g., $5000 location fee)

**Calendar Integration:** ✅ CRITICAL CHANGE
- Material lines CAN use phase selector (same UI as labor)
- For day/week rates: calculate days from selected calendar dates
- For flat rates: allocate pro-rata across active phases OR manual allocation

**Calculation Examples:**

**Example 1: Daily Equipment Rental**
```
Item: Camera Package
Rate: $1,500/day
Unit: day
Calendar: Shoot (25 days) + Prep (3 days)

Calculation:
- Prep: 3 days × $1,500 = $4,500
- Shoot: 25 days × $1,500 = $37,500
- Total: $42,000
```

**Example 2: Weekly Equipment Rental**
```
Item: Lighting Package
Rate: $3,000/week
Unit: week
Calendar: Shoot (25 days)
Days/Week: 5

Calculation:
- Weeks: 25 ÷ 5 = 5 weeks
- Total: $3,000 × 5 = $15,000
```

**Example 3: Flat Fee Material**
```
Item: Location Fee
Rate: $10,000
Unit: flat
Allocation: Manual (80% Shoot, 20% Prep)

Calculation:
- Prep: $10,000 × 20% = $2,000
- Shoot: $10,000 × 80% = $8,000
- Total: $10,000
```

**Key Rules:**
- ✅ Materials DO use calendar dates (when unit = day or week)
- ❌ NO fringes on materials
- ❌ NO overtime/penalty rates for materials
- ❌ NO weekend discounts (keep simple)
- ✅ Display prep/shoot/post breakdown in tooltip (same as labor)

---

## 4. Calendar Hierarchy Resolution

### 4.1 Cascade Logic

```
LineItem.calendar_mode === "custom" 
  → Use LineItem.phase_details
  
LineItem.calendar_mode === "inherit" 
  → Check BudgetGrouping.calendar_overrides[phase]
  → If grouping.override.inherit === false
      → Use grouping.override
  → Else
      → Use ProjectCalendar (global)
```

### 4.2 Phase Configuration Shape

```typescript
PhaseConfig {
  defaultHours: number     // Hours per day (e.g., 10 for shoot)
  dates: string[]          // ISO date strings of working days
  inherit?: boolean        // If true, use parent level
}
```

### 4.3 Data Flow

```
User opens DepartmentSettingsPopover
  → Modifies shoot.defaultHours = 12
  → Selects custom dates (e.g., weekends included)
  → Saves to context: groupingOverrides[groupId].shoot = {...}
  
User adds line item
  → calendar_mode defaults to "inherit"
  → Calculation reads groupingOverrides[groupId].shoot
  → If not found, reads projectCalendar.shoot
  
User opens line item PhaseOverridePopover
  → Switches calendar_mode to "custom"
  → Sets custom dates for this person only
  → Saves to LineItem.phase_details
```

---

## 5. API Contract Design

### 5.1 Calculation Endpoint

**PROPOSED:** `POST /api/calculate-labor-cost`

**Request:**
```json
{
  "lineItemId": "uuid",
  "baseRate": 50.00,
  "unit": "hour",
  "isCasual": false,
  "isArtist": false,
  "calendarMode": "inherit" | "custom",
  "phaseDetails": {
    "preProd": { "defaultHours": 8, "dates": ["2026-01-15", ...] },
    "shoot": { "defaultHours": 12, "dates": ["2026-02-01", ...] },
    "postProd": { "defaultHours": 8, "dates": ["2026-03-10", ...] }
  },
  "awardClassificationId": "optional-payguide-key"
}
```

**Response:**
```json
{
  "totalCost": 45600.00,
  "breakdown": {
    "preProd": { "days": 10, "cost": 5000, "details": [...] },
    "shoot": { "days": 25, "cost": 35000, "details": [...] },
    "postProd": { "days": 5, "cost": 2500, "details": [...] }
  },
  "fringes": {
    "super": 5244.00,
    "holidayPay": 1824.00,
    "payrollTax": 2211.60,
    "workersComp": 684.00,
    "totalFringes": 9963.60
  },
  "dailyDetails": [
    {
      "date": "2026-02-01",
      "phase": "shoot",
      "dayType": "WEEKDAY",
      "hours": 12,
      "baseCost": 500,
      "overtime": 150,
      "totalDayCost": 650,
      "multiplier": 1.0,
      "isHoliday": false
    }
  ]
}
```

### 5.2 Material Calculation

**PROPOSED:** Simple client-side calculation or lightweight endpoint

```typescript
// Client-side
const totalMaterial = rate * (prepQty + shootQty + postQty)
```

---

## 6. Implementation Phases

### Phase 1: Backend Foundation
- [ ] Enhance `calculate_weekly_labor_rate` to accept phase-based input
- [ ] Create `/api/calculate-labor-cost` endpoint with full phase breakdown
- [ ] Integrate `rate_lookup_service` with calendar day types
- [ ] Add unit tests for all calculation modes

### Phase 2: Calendar Integration
- [ ] Persist grouping overrides to `BudgetGrouping.calendar_overrides`
- [ ] Persist line item overrides to `LineItem.phase_details`
- [ ] Update API to fetch and merge hierarchical calendar data

### Phase 3: Frontend Connection
- [ ] Update `BudgetRow.tsx` to trigger recalc on any field change
- [ ] Enhance `InlineItemEditor.tsx` to support unit selection
- [ ] Add visual breakdown of phase costs in InspectorPanel
- [ ] Real-time calculation preview in form fields

### Phase 4: Polish & Validation
- [ ] Error handling for missing calendar data
- [ ] Warning indicators for weekend/holiday work
- [ ] Audit log for calculation parameter changes
- [ ] Export breakdown to Excel

---

## 7. Open Design Questions

### 7.1 Daily Rate Handling ✅
**Q1:** When a user enters a "daily rate", should weekend penalties still apply?  
**DECISION:** Daily rate is "all-in" (no penalties)  
**Rationale:** Simplifies budgeting for fixed-day-rate crew. Weekend work is negotiated separately.

---

### 7.2 Partial Week Calculation ✅
**Q2:** For weekly rates, how should we handle partial weeks?  
**Example:** 12 days @ 5-day week = 2.4 weeks  
**DECISION:** Pro-rata calculation: `rate * 2.4` = $12,000  
**Rationale:** Most accurate reflection of actual work performed.

---

### 7.3 Flat Rate Fringes ✅
**Q3:** Should fringes apply to flat-rate contractors?  
**DECISION:** No fringes on flat rates  
**Rationale:** Flat rates typically represent contractor agreements where fringes are their responsibility.

---

### 7.4 Overtime in Mixed Units ✅
**Q4:** If a line item has different hours per phase, how is overtime calculated?  
**Example:**
- Prep: 8 hours/day (no OT)
- Shoot: 12 hours/day (4 hours OT)
- Post: 8 hours/day (no OT)

**DECISION:** Each day calculated independently ✓  
**Rationale:** Matches real-world timesheet processing and union agreements.

---

### 7.5 Calendar Data Source Truth ✅
**Q5:** When should calendar overrides be persisted to DB vs kept in context?  
**DECISION:** Persist immediately on popover save  
**Rationale:** Prevents data loss and enables multi-user collaboration. Budget save should only affect line items.

---

### 7.6 Casual Loading Interaction ✅
**Q6:** For casual workers, does the loading apply BEFORE overtime multipliers?  
**Example:** 10 hours, casual, base $50/hr
- Method A: `(50 * 1.25) * 8h + (50 * 1.25 * 1.5) * 2h` = 687.50 ✓

**DECISION:** Method A - Loading applies first  
**Rationale:** Aligns with `pay_rules_reference.md` lines 62-65 and standard award interpretation.

---

### 7.7 Public Holiday Detection ✅
**Q7:** Should the system auto-detect holidays from calendar or require manual flagging?  
**DECISION:** Always apply highest rate (holiday > weekend > weekday), no manual override  
**Rationale:** Ensures legal compliance. If user wants lower rate, they remove the date from calendar.

---

### 7.8 Unit Display vs Calculation Unit ✅
**Q8:** For hourly labor, should we display the hourly rate or weekly rate in the budget?  
**DECISION:** Display hourly rate ($50/hr) in the rate column  
**Rationale:** More intuitive for crew negotiations. Weekly total shown in Total column.  
**Implementation:** `rate = base_hourly_rate`, `total = calculated_weekly * weeks`

---

### 7.9 Error Tolerance ✅
**Q9:** How should system handle missing calendar data?  
**DECISION:** Use hardcoded defaults (8h/day, Mon-Fri, 40h weeks)  
**Rationale:** Allows budgeting before calendar is finalized. Show warning indicator.

---

### 7.10 Performance Optimization ✅
**Q10:** Should calculations happen on every keystroke or on explicit "Calculate" button?  
**DECISION:** Real-time with debouncing (500ms)  
**Rationale:** Best UX, manageable API load with proper debouncing and caching.

---

## 7B. Advanced Design Questions - Round 2

### 7.11 Multi-Phase Rate Variations ✅
**Q11:** If a role has different HOURLY rates for different phases, how should this be handled?  
**DECISION:** Not supported in v1 - use 3 separate line items  
**Rationale:** Keeps data model simple. Users can create "DOP - Prep", "DOP - Shoot", "DOP - Post"  
**Workaround:** Name line items clearly to indicate phase-specific rates

---

### 7.12 Allowances & Per Diems ✅
**Q12:** How should per-diem, kit fees, and other allowances be implemented?  
**DECISION:** Allowances are separate line items (not integrated into labor calc)  
**Rationale:** Cleaner separation of concerns, easier auditing  
**Implementation:**
- Kit rental: Material line item, $150/day
- Meal allowance: Material line item, $80/day
- Each gets its own phase quantities

---

### 7.13 Box Rentals & Recurring Equipment ✅ CRITICAL
**Q13:** For recurring equipment rentals, should they follow labor calendar or custom logic?  
**DECISION:** Materials WILL use calendar logic  
**Rationale:** Equipment often charged at day/week rates tied to production schedule  
**Implementation:**
- Material lines CAN use phase selector (same as labor)
- Support units: day, week, flat
- NO weekend discounts (keep simple)

**ACTION REQUIRED:** Extend material calculation to support calendar-based quantities

---

### 7.14 Fringe Breakdown Visibility ✅
**Q14:** How should fringe breakdowns be displayed in the UI?  
**DECISION:** Tooltip on hover over total  
**Content:** Show Super/Holiday Pay/Tax/Comp breakdown + Prep/Shoot/Post split  
**Example Tooltip:**
```
Total: $52,450
├─ Prep: $8,500 (10 days)
├─ Shoot: $38,000 (35 days)
└─ Post: $5,950 (7 days)

Fringes: $9,872
├─ Superannuation (11.5%): $6,032
├─ Holiday Pay (4%): $2,098
├─ Payroll Tax (4.85%): $2,544
└─ Workers Comp (1.5%): $786
```

---

### 7.15 Calendar Conflict Warnings ⏸️
**DECISION:** Deferred - Not in scope for v1  
**Rationale:** Focus on core calculation accuracy first

---

### 7.16 Copy/Paste & Bulk Operations ⏸️
**DECISION:** Deferred - Might implement later  
**Rationale:** Power user feature, not blocking

---

### 7.17 Version Control & Audit Trail ⏸️
**DECISION:** Deferred - Might implement later  
**Rationale:** Nice-to-have, not critical for initial release

---

### 7.18 Locked vs Unlocked Totals ⏸️
**DECISION:** Not an issue for v1  
**Rationale:** Calculated totals are authoritative. Manual overrides not needed initially.

---

### 7.19 Multi-Currency Support ⏸️
**DECISION:** Not in scope for v1  
**Rationale:** Single-currency budgets sufficient for initial market

---

### 7.20 Mobile & Offline Mode ⏸️
**DECISION:** Not in scope for v1  
**Rationale:** Office-based usage assumed, online-only acceptable

---



| Risk | Impact | Mitigation |
|------|--------|------------|
| Calendar data not synced between context and DB | High | Implement auto-save with optimistic updates |
| Payguide classifications missing for custom roles | Medium | Fallback to manual rate entry with warning |
| Overtime calculation edge cases | High | Comprehensive test suite with real-world scenarios |
| UI performance with 100+ line items | Medium | Virtualized lists, calculation batching |
| Timezone handling for dates | Low | Store all dates in UTC, display in project timezone |

---

## 9. Success Criteria

1. ✅ User can add labor line with hourly rate
2. ✅ System auto-calculates cost based on global calendar
3. ✅ User can override calendar at group level
4. ✅ User can override calendar at line item level
5. ✅ Weekend/holiday penalties applied correctly per pay rules
6. ✅ Casual loading calculated accurately
7. ✅ Fringes calculated and displayed separately
8. ✅ Material lines calculated correctly (no fringes)
9. ✅ Weekly and flat rates supported
10. ✅ Phase breakdown visible in inspector panel

---

## 10. Next Steps

1. **Design Review:** Answer open questions (Section 7)
2. **Finalize Spec:** Document decisions
3. **Backend Implementation:** Phase 1 tasks
4. **Frontend Integration:** Phase 3 tasks
5. **Testing:** End-to-end scenarios
6. **Documentation:** User guide for calculation modes

---

## Appendix A: Example Calculations

### Example 1: Hourly Crew, Standard Week
```
Role: Camera Operator
Base Rate: $50/hr
Days: 5 (Mon-Fri)
Hours: 10/day
Casual: No

Calculation:
Day 1-5:
  - 0-7.6h: 7.6 * $50 = $380
  - 7.6-9.6h: 2 * $50 * 1.5 = $150
  - 9.6-10h: 0.4 * $50 * 2.0 = $40
  - Total/day: $570
Week Total: $570 * 5 = $2,850

Fringes:
  - Super 11.5%: $327.75
  - Holiday Pay 4%: $114.00
  - Payroll Tax 4.85%: $138.23
  - Workers Comp 1.5%: $42.75
  - Total Fringes: $622.73

Grand Total: $3,472.73
```

### Example 2: Weekly Rate with Partial Week
```
Role: Producer
Weekly Rate: $5,000
Working: 12 days over Shoot phase
Days/Week: 5

Calculation:
Weeks: 12 / 5 = 2.4 weeks
Total: $5,000 * 2.4 = $12,000

Fringes: (if applicable, see Q3)
Total: $12,000 + fringes
```

### Example 3: Flat Rate, Multi-Phase
```
Role: VFX Supervisor
Flat Rate: $25,000
Phases: Shoot (20%) + Post (80%)

Allocation:
  - Shoot: $5,000
  - Post: $20,000
  - Total: $25,000

Fringes: TBD based on Q3 answer
```

---

**END OF SPECIFICATION DRAFT**
