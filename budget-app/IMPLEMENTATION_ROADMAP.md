# Labor & Material Calculation - Implementation Roadmap

**Project:** ShortKings Budget Application  
**Version:** 1.0  
**Date:** 2026-01-29  
**Status:** APPROVED - Ready for Implementation

---

## ✅ Design Decisions Summary

All 20 design questions answered. Scope locked for v1.

### Core Calculation Logic (Q1-Q10)
- ✅ Daily rates: All-in (no weekend penalties)
- ✅ Partial weeks: Pro-rata calculation
- ✅ Flat rate fringes: NO
- ✅ Overtime: Per-day calculation
- ✅ Calendar persistence: Save on popover close
- ✅ Casual loading: Applied BEFORE overtime multipliers
- ✅ Holidays: Auto-detect, always pay highest rate
- ✅ Unit display: Show hourly rate ($50/hr) not weekly
- ✅ Missing calendar: Use defaults (8h/day, Mon-Fri)
- ✅ Calculation trigger: Real-time with 500ms debounce

### Advanced Features (Q11-Q20)
- ⏸️ Multi-phase rates: Use separate line items
- ⏸️ Allowances: Separate material line items
- ✅ Material calendar: YES - critical feature
- ✅ Fringe tooltip: Hover with prep/shoot/post breakdown
- ⏸️ Conflict warnings: Deferred to v2
- ⏸️ Bulk operations: Deferred to v2
- ⏸️ Audit trail: Deferred to v2
- ⏸️ Total overrides: Not needed v1
- ⏸️ Multi-currency: Deferred to v2
- ⏸️ Offline mode: Deferred to v2

---

## 📋 Implementation Phases

### Phase 1: Backend Calculation Engine (3-5 days)

#### Task 1.1: Enhance Labor Calculation API
**File:** `backend/main.py`

Create new endpoint: `POST /api/calculate-labor-cost`

**Input Schema:**
```python
class LaborCostRequest(BaseModel):
    line_item_id: Optional[str]
    base_hourly_rate: float
    is_casual: bool
    is_artist: bool  # Category E vs Crew
    
    # Calendar resolution
    calendar_mode: str  # "inherit" | "custom"
    phase_details: Optional[Dict]  # Custom calendar if mode=custom
    grouping_id: Optional[str]  # For inherit mode
    project_id: str
    
    # Optional overrides
    award_classification_id: Optional[str]
```

**Response Schema:**
```python
{
    "total_cost": 52450.00,
    "breakdown": {
        "preProd": {
            "days": 10,
            "gross_cost": 8500.00,
            "details": [
                {
                    "date": "2026-01-15",
                    "day_type": "WEEKDAY",
                    "hours": 8,
                    "base_cost": 400,
                    "overtime_cost": 0,
                    "total_day_cost": 400,
                    "multiplier": 1.0
                }
            ]
        },
        "shoot": { ... },
        "postProd": { ... }
    },
    "fringes": {
        "super": 6032.00,
        "holiday_pay": 2098.00,
        "payroll_tax": 2544.00,
        "workers_comp": 786.00,
        "total_fringes": 9872.00
    }
}
```

**Implementation Steps:**
1. Create calendar resolution logic (line → group → global)
2. Integrate with existing `rate_lookup_service.py`
3. Apply pay rules from `pay_rules_reference.md`
4. Calculate fringes (Super 11.5%, Holiday 4%, Tax 4.85%, Comp 1.5%)
5. Return detailed breakdown

**Acceptance Criteria:**
- [ ] Can calculate hourly rate with calendar dates
- [ ] Casual loading applied correctly (before OT)
- [ ] Weekend/holiday penalties from pay rules
- [ ] Fringes calculated accurately
- [ ] Phase breakdown returned

---

#### Task 1.2: Material Calculation API
**File:** `backend/main.py`

Create new endpoint: `POST /api/calculate-material-cost`

**Input Schema:**
```python
class MaterialCostRequest(BaseModel):
    rate: float
    unit: str  # "day" | "week" | "flat"
    
    # Calendar (if unit != flat)
    calendar_mode: str
    phase_details: Optional[Dict]
    grouping_id: Optional[str]
    project_id: str
    
    # For flat rates
    manual_allocation: Optional[Dict]  # {"prep": 0.2, "shoot": 0.8}
```

**Response Schema:**
```python
{
    "total_cost": 42000.00,
    "breakdown": {
        "preProd": {"days": 3, "cost": 4500.00},
        "shoot": {"days": 25, "cost": 37500.00},
        "postProd": {"days": 0, "cost": 0}
    },
    "fringes": null  # Never for materials
}
```

**Implementation Steps:**
1. Reuse calendar resolution from labor calc
2. Count days per phase from calendar
3. Calculate: rate × days (or weeks)
4. For flat rates: apply manual allocation or pro-rata

**Acceptance Criteria:**
- [ ] Day rate: counts calendar days correctly
- [ ] Week rate: pro-rata calculation (25 days ÷ 5 = 5 weeks)
- [ ] Flat rate: manual allocation works
- [ ] NO fringes applied
- [ ] Phase breakdown returned

---

#### Task 1.3: Calendar Override Persistence
**Files:** `backend/main.py`, `models.py`

**API Endpoints:**

```python
# Save group-level overrides
PUT /api/groupings/{grouping_id}/calendar
{
    "preProd": {"defaultHours": 8, "dates": [...], "inherit": false},
    "shoot": {"defaultHours": 12, "dates": [...], "inherit": false}
}

# Save line-item overrides
PUT /api/line-items/{item_id}/calendar
{
    "calendar_mode": "custom",
    "phase_details": {...}
}
```

**Implementation:**
- Update `BudgetGrouping.calendar_overrides` field
- Update `LineItem.phase_details` and `calendar_mode`
- Return success confirmation

**Acceptance Criteria:**
- [ ] Group overrides persist immediately
- [ ] Line item overrides persist immediately
- [ ] Data survives page refresh
- [ ] Hierarchical resolution works (line > group > global)

---

#### Task 1.4: Unit Testing
**File:** `backend/tests/test_labor_calculations.py`

**Test Cases:**
1. Hourly rate, standard week (Mon-Fri, 8h/day, no OT)
2. Hourly rate with overtime (12h/day)
3. Hourly rate with weekend work (Sat/Sun penalties)
4. Hourly rate with public holiday (2.5x rate)
5. Casual loading (before OT multipliers)
6. Weekly rate with partial weeks (2.4 weeks = pro-rata)
7. Flat rate (no fringes)
8. Material day rate with calendar
9. Material week rate with calendar
10. Calendar hierarchy resolution (custom > group > global)

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Edge cases covered (0 days, 100 days, fractional weeks)
- [ ] Pay rules verified against reference doc

---

### Phase 2: Frontend Integration (4-6 days)

#### Task 2.1: Update BudgetRow Calculation Trigger
**File:** `budget-app/frontend/components/BudgetRow.tsx`

**Changes:**
1. Add debounced calculation hook (500ms)
2. Trigger on field changes: `base_hourly_rate`, `is_casual`, `phase_details`
3. Call appropriate API (`/calculate-labor-cost` or `/calculate-material-cost`)
4. Update local state with returned total and breakdown
5. Store `fringes_json` in line item

**Implementation:**
```typescript
const [isCalculating, setIsCalculating] = useState(false)

const debouncedCalculate = useMemo(
  () => debounce(async (item: BudgetLineItem) => {
    if (!item.is_labor && item.unit === 'flat') {
      // Simple client-side calc for flat materials
      return
    }
    
    setIsCalculating(true)
    try {
      const endpoint = item.is_labor 
        ? '/api/calculate-labor-cost'
        : '/api/calculate-material-cost'
      
      const result = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({...item, project_id: projectId})
      })
      
      const data = await result.json()
      
      onChange({
        total: data.total_cost,
        fringes_json: JSON.stringify(data.fringes),
        breakdown_json: JSON.stringify(data.breakdown)
      })
    } finally {
      setIsCalculating(false)
    }
  }, 500),
  []
)

useEffect(() => {
  debouncedCalculate(item)
}, [item.base_hourly_rate, item.is_casual, item.phase_details])
```

**Acceptance Criteria:**
- [ ] Real-time calculation with debounce
- [ ] Loading indicator during API call
- [ ] Graceful error handling
- [ ] Total updates immediately after API response

---

#### Task 2.2: Fringe Breakdown Tooltip
**File:** `budget-app/frontend/components/BudgetRow.tsx`

**Component:**
```typescript
<Tippy 
  content={<FringeBreakdown item={item} />}
  placement="top"
  interactive
>
  <span className="cursor-help underline decoration-dotted">
    ${item.total.toLocaleString()}
  </span>
</Tippy>
```

**FringeBreakdown Component:**
```typescript
function FringeBreakdown({ item }: { item: BudgetLineItem }) {
  const breakdown = JSON.parse(item.breakdown_json || '{}')
  const fringes = JSON.parse(item.fringes_json || '{}')
  
  return (
    <div className="text-xs space-y-2 p-2">
      <div className="font-bold">Total: ${item.total.toLocaleString()}</div>
      
      {/* Phase breakdown */}
      {breakdown.preProd && (
        <div>├─ Prep: ${breakdown.preProd.cost} ({breakdown.preProd.days} days)</div>
      )}
      {breakdown.shoot && (
        <div>├─ Shoot: ${breakdown.shoot.cost} ({breakdown.shoot.days} days)</div>
      )}
      {breakdown.postProd && (
        <div>└─ Post: ${breakdown.postProd.cost} ({breakdown.postProd.days} days)</div>
      )}
      
      {/* Fringes */}
      {fringes && (
        <div className="mt-2 pt-2 border-t">
          <div className="font-bold">Fringes: ${fringes.total_fringes}</div>
          <div className="ml-2 text-slate-400">
            <div>├─ Super (11.5%): ${fringes.super}</div>
            <div>├─ Holiday Pay (4%): ${fringes.holiday_pay}</div>
            <div>├─ Payroll Tax (4.85%): ${fringes.payroll_tax}</div>
            <div>└─ Workers Comp (1.5%): ${fringes.workers_comp}</div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Tooltip appears on hover
- [ ] Shows phase breakdown (prep/shoot/post)
- [ ] Shows fringe breakdown (only for labor)
- [ ] Material items show simple phase breakdown (no fringes)

---

#### Task 2.3: Material Phase Selector UI
**File:** `budget-app/frontend/components/InlineItemEditor.tsx`

**Changes:**
1. Enable phase selector for materials (same as labor)
2. Show/hide based on unit type:
   - Unit = "day" or "week": Show phase selector
   - Unit = "flat": Show allocation percentages or hide
3. Update API call to include calendar data

**Acceptance Criteria:**
- [ ] Material items can select phases
- [ ] Calendar button visible for non-flat materials
- [ ] Phase override popover works same as labor
- [ ] Calculation updates when phases change

---

#### Task 2.4: Calendar Persistence Integration
**Files:** 
- `budget-app/frontend/components/DepartmentSettingsPopover.tsx`
- `budget-app/frontend/components/PhaseOverridePopover.tsx`

**Changes:**

**DepartmentSettingsPopover:**
```typescript
const handleSave = async (updatedData: CalendarData) => {
  // Save to backend immediately
  await fetch(`/api/groupings/${groupingId}/calendar`, {
    method: 'PUT',
    body: JSON.stringify(updatedData)
  })
  
  // Update context
  updateGroupingOverride(groupingId, 'preProd', updatedData.preProd)
  updateGroupingOverride(groupingId, 'shoot', updatedData.shoot)
  updateGroupingOverride(groupingId, 'postProd', updatedData.postProd)
  
  setIsOpen(false)
}
```

**PhaseOverridePopover (for line items):**
```typescript
const handleSave = async (updatedData: CalendarData) => {
  // Save to line item
  await fetch(`/api/line-items/${lineItemId}/calendar`, {
    method: 'PUT',
    body: JSON.stringify({
      calendar_mode: 'custom',
      phase_details: updatedData
    })
  })
  
  onSave(updatedData)
}
```

**Acceptance Criteria:**
- [ ] Group overrides save to DB on popover close
- [ ] Line item overrides save to DB on popover close
- [ ] No data loss on page refresh
- [ ] Loading states during save

---

#### Task 2.5: Unit Display Updates
**File:** `budget-app/frontend/components/BudgetRow.tsx`

**Changes:**
- Display `base_hourly_rate` in Rate column for labor items
- Display calculated weekly/total in Total column
- Add unit indicator next to rate ($50/hr vs $2500/week)

**Acceptance Criteria:**
- [ ] Hourly labor shows: $50/hr (not $2500/week)
- [ ] Weekly labor shows: $2500/week
- [ ] Materials show appropriate units
- [ ] Unit changes update display immediately

---

### Phase 3: Testing & Polish (2-3 days)

#### Task 3.1: End-to-End Testing
**Scenarios:**
1. Add hourly labor line, verify calculation
2. Change casual toggle, verify recalculation
3. Override group calendar, verify line items update
4. Override line item calendar, verify precedence
5. Add material with day rate, verify calendar usage
6. Add material with flat rate, verify allocation
7. Hover over totals, verify tooltips
8. Save budget, reload page, verify persistence

**Acceptance Criteria:**
- [ ] All scenarios pass
- [ ] No console errors
- [ ] Performance acceptable (<500ms API response)

---

#### Task 3.2: Default Calendar Setup
**File:** `backend/main.py`

**Add hardcoded defaults when no calendar exists:**
```python
DEFAULT_CALENDAR = {
    "preProd": {
        "defaultHours": 8,
        "dates": generate_weekdays(days=10)  # Helper function
    },
    "shoot": {
        "defaultHours": 10,
        "dates": generate_weekdays(days=20)
    },
    "postProd": {
        "defaultHours": 8,
        "dates": generate_weekdays(days=10)
    }
}
```

**Acceptance Criteria:**
- [ ] Missing calendar returns sensible defaults
- [ ] Warning indicator shown in UI
- [ ] User can set proper calendar later

---

#### Task 3.3: Error Handling & Edge Cases
**Scenarios:**
1. API timeout (>5s) - show error, retry button
2. Invalid calendar data - fallback to defaults
3. Negative hours - validation error
4. Missing project - error message
5. Concurrent edits - optimistic update with rollback

**Acceptance Criteria:**
- [ ] Graceful error messages
- [ ] No crashes
- [ ] Data integrity maintained

---

### Phase 4: Documentation (1 day)

#### Task 4.1: User Guide
**File:** `budget-app/USER_GUIDE_CALCULATIONS.md`

**Sections:**
1. How to add labor line items
2. Understanding hourly vs weekly vs flat rates
3. Using calendar overrides (global/group/line)
4. Reading fringe breakdowns
5. Material calendar usage
6. Troubleshooting common issues

---

#### Task 4.2: Developer Documentation
**File:** `budget-app/DEVELOPER_CALCULATIONS.md`

**Sections:**
1. API endpoint reference
2. Calculation algorithm details
3. Pay rules implementation
4. Calendar hierarchy resolution
5. Adding new pay rules
6. Testing strategy

---

## 🎯 Success Metrics

### Performance
- [ ] API response time <500ms (p95)
- [ ] Debounce prevents >1 API call per second
- [ ] UI remains responsive during calculation

### Accuracy
- [ ] 100% match with pay_rules_reference.md
- [ ] Fringes match manual calculation (±$0.01)
- [ ] Calendar days counted correctly

### Usability
- [ ] Users can complete budget in <30min
- [ ] Tooltip provides sufficient detail
- [ ] No training required for basic usage

---

## 📦 Deliverables Checklist

### Backend
- [ ] `/api/calculate-labor-cost` endpoint
- [ ] `/api/calculate-material-cost` endpoint
- [ ] `/api/groupings/{id}/calendar` PUT endpoint
- [ ] `/api/line-items/{id}/calendar` PUT endpoint
- [ ] Unit tests (>90% coverage)
- [ ] Integration tests

### Frontend
- [ ] Real-time calculation with debounce
- [ ] Fringe breakdown tooltip
- [ ] Material phase selector
- [ ] Calendar persistence
- [ ] Unit display corrections
- [ ] Error handling

### Documentation
- [ ] User guide
- [ ] Developer docs
- [ ] API reference
- [ ] This spec marked as COMPLETE

---

## 🚀 Deployment Plan

### Pre-Deployment
1. Run full test suite
2. Manual QA on staging
3. Performance profiling
4. Backup production database

### Deployment Steps
1. Deploy backend API changes
2. Run database migrations (if any)
3. Deploy frontend changes
4. Verify health checks
5. Monitor error rates for 24h

### Rollback Plan
If critical issues detected:
1. Revert frontend to previous version
2. Redirect API calls to legacy calc (if exists)
3. Investigate + fix
4. Re-deploy

---

## 📞 Support & Maintenance

### Known Limitations (v1)
- Multi-phase rate variations not supported (use 3 line items)
- Allowances must be separate line items
- No audit trail of calculation changes
- No bulk operations
- Single currency only
- Online-only (no offline mode)

### Future Enhancements (v2)
- Conflict detection (overlapping assignments)
- Copy/paste calendar settings
- Audit trail
- Total override mode
- Multi-currency support
- Mobile optimization

---

**Document Status:** APPROVED ✅  
**Ready for Development:** YES  
**Estimated Total Effort:** 10-15 days  
**Priority:** P0 - Critical Path
