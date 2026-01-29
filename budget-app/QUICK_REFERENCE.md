# 📋 Quick Reference: Labor & Material Calculation Rules

**Version:** 1.0 APPROVED  
**For:** ShortKings Budget App Development Team

---

## 🎯 TL;DR - What We're Building

**Goal:** Connect backend labor calculations to frontend budget UI with full calendar integration

**Key Features:**
1. ✅ Real-time calculation (500ms debounce)
2. ✅ Calendar hierarchy (line → group → global)
3. ✅ Pay rules compliance (overtime, weekends, holidays)
4. ✅ Materials use calendar logic (NEW!)
5. ✅ Fringe breakdown tooltips
6. ✅ Immediate persistence of calendar overrides

---

## 💰 Calculation Logic Summary

### Labor Lines

| Unit Type | Calculation | Fringes | Example |
|-----------|-------------|---------|---------|
| **Hourly** | Base rate × hours × days (with OT) | YES | $50/hr × 10h × 25 days = varies by day type |
| **Daily** | Daily rate × days (all-in, NO penalties) | YES | $500/day × 25 days = $12,500 |
| **Weekly** | Weekly rate × (days ÷ days_per_week) | YES | $2500/wk × (25÷5) = $12,500 |
| **Flat** | Fixed fee (pro-rata allocation) | NO | $25,000 (80% shoot, 20% post) |

### Material Lines

| Unit Type | Calculation | Fringes | Example |
|-----------|-------------|---------|---------|
| **Day** | Rate × calendar days | NO | $1500/day × 28 days = $42,000 |
| **Week** | Rate × (days ÷ days_per_week) | NO | $3000/wk × (25÷5) = $15,000 |
| **Flat** | Fixed fee (manual allocation) | NO | $10,000 (100% shoot) |

---

## 📅 Calendar Hierarchy

```
LineItem.calendar_mode === "custom"
  → Use LineItem.phase_details
  
LineItem.calendar_mode === "inherit"
  → Check BudgetGrouping.calendar_overrides
      → If grouping.inherit === false
          → Use grouping override
      → Else
          → Use ProjectCalendar (global)
```

**Default Fallback (if no calendar set):**
- Prep: 10 days, 8h/day, Mon-Fri
- Shoot: 20 days, 10h/day, Mon-Fri
- Post: 10 days, 8h/day, Mon-Fri

---

## ⚡ Pay Rules (from pay_rules_reference.md)

### Crew (Non-Category E)

**Monday - Friday:**
- 0-7.6h: 1.0x
- 7.6-9.6h: 1.5x
- 9.6h+: 2.0x

**Saturday:**
- 0-7.6h: 1.5x
- 7.6-9.6h: 1.75x
- 9.6h+: 2.0x

**Sunday:**
- 0-7.6h: 1.75x
- 7.6h+: 2.0x

**Public Holiday:**
- All hours: 2.5x

**Casual Loading:** +25% (applied BEFORE overtime multipliers)

### Artists (Category E)

**Monday - Saturday:**
- 0-7.6h: 1.0x
- 7.6-9.6h: 1.5x
- 9.6h+: 2.0x

**Sunday:**
- All hours: 2.0x

**Public Holiday:**
- All hours: 2.5x

**Casual Loading:** +25% (applied BEFORE overtime multipliers)

---

## 🧮 Fringe Rates

Applied to **labor lines only** (not materials, not flat rates):

| Component | Rate | Base |
|-----------|------|------|
| Superannuation | 11.5% | Gross labor cost |
| Holiday Pay | 4.0% | Gross labor cost |
| Payroll Tax | 4.85% | Gross labor cost |
| Workers Comp | 1.5% | Gross labor cost |
| **TOTAL** | **21.85%** | |

**Note:** Contingency (10%) is NOT a fringe, it's a budget-level buffer

---

## 🔧 API Endpoints

### Calculate Labor Cost
```http
POST /api/calculate-labor-cost
Content-Type: application/json

{
  "base_hourly_rate": 50.00,
  "is_casual": false,
  "is_artist": false,
  "calendar_mode": "inherit",
  "grouping_id": "uuid",
  "project_id": "uuid"
}
```

**Response:**
```json
{
  "total_cost": 52450.00,
  "breakdown": {
    "preProd": { "days": 10, "cost": 8500 },
    "shoot": { "days": 25, "cost": 38000 },
    "postProd": { "days": 5, "cost": 2500 }
  },
  "fringes": {
    "super": 6032,
    "holiday_pay": 2098,
    "payroll_tax": 2544,
    "workers_comp": 786,
    "total_fringes": 9872
  }
}
```

### Calculate Material Cost
```http
POST /api/calculate-material-cost
Content-Type: application/json

{
  "rate": 1500.00,
  "unit": "day",
  "calendar_mode": "inherit",
  "grouping_id": "uuid",
  "project_id": "uuid"
}
```

**Response:**
```json
{
  "total_cost": 42000.00,
  "breakdown": {
    "preProd": { "days": 3, "cost": 4500 },
    "shoot": { "days": 25, "cost": 37500 },
    "postProd": { "days": 0, "cost": 0 }
  },
  "fringes": null
}
```

### Save Group Calendar Override
```http
PUT /api/groupings/{grouping_id}/calendar
Content-Type: application/json

{
  "shoot": {
    "defaultHours": 12,
    "dates": ["2026-02-01", "2026-02-02", ...],
    "inherit": false
  }
}
```

### Save Line Item Calendar Override
```http
PUT /api/line-items/{item_id}/calendar
Content-Type: application/json

{
  "calendar_mode": "custom",
  "phase_details": {
    "shoot": {
      "defaultHours": 10,
      "dates": ["2026-02-01", ...]
    }
  }
}
```

---

## 🎨 UI Components

### Fringe Breakdown Tooltip (on Total hover)
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

### Material Tooltip (no fringes)
```
Total: $42,000
├─ Prep: $4,500 (3 days)
├─ Shoot: $37,500 (25 days)
└─ Post: $0 (0 days)
```

---

## ⚠️ Edge Cases & Rules

### DO ✅
- Apply casual loading BEFORE overtime multipliers
- Use calendar dates for material day/week rates
- Persist calendar overrides immediately on save
- Show hourly rate in Rate column (not weekly)
- Auto-detect public holidays (always pay highest rate)
- Use defaults if calendar not set (with warning)

### DON'T ❌
- Apply weekend penalties to daily rates (all-in)
- Apply fringes to flat rates
- Apply fringes to materials
- Round partial weeks (use exact pro-rata)
- Allow manual holiday override (compliance risk)
- Block save if calendar missing (use defaults)

---

## 🧪 Test Scenarios

### Must Pass Before Deployment

1. **Hourly Standard Week**
   - $50/hr, 5 days, 8h/day, not casual
   - Expected: $2,000 (no OT) + fringes

2. **Hourly with Overtime**
   - $50/hr, 5 days, 12h/day, not casual
   - Expected: $3,750/week (0-7.6h @ 1x, 7.6-9.6h @ 1.5x, 9.6-12h @ 2x) + fringes

3. **Casual Loading**
   - $50/hr, 5 days, 10h/day, casual
   - Expected: Effective $62.50/hr base, then OT on loaded rate

4. **Weekend Work**
   - $50/hr, Sat+Sun, 10h/day, not casual
   - Expected: Higher multipliers per pay rules

5. **Public Holiday**
   - $50/hr, 1 holiday, 10h/day, not casual
   - Expected: 2.5x rate (Crew) or per pay rules

6. **Weekly Pro-Rata**
   - $2500/week, 12 days worked, 5 day week
   - Expected: $2500 × 2.4 = $6,000

7. **Flat Rate No Fringes**
   - $25,000 flat
   - Expected: $25,000 (no fringes added)

8. **Material Calendar**
   - $1500/day equipment, 28 days from calendar
   - Expected: $42,000 (no fringes)

9. **Calendar Hierarchy**
   - Line custom > Group override > Global default
   - Expected: Correct cascade resolution

10. **Missing Calendar Fallback**
    - No calendar set
    - Expected: Use defaults (40h/week) + show warning

---

## 📊 Database Schema Changes

### BudgetGrouping (existing, needs update)
```python
calendar_overrides: Optional[Dict] = Field(default={}, sa_column=Column(JSON))
# Shape: { "shoot": { "defaultHours": 12, "dates": [...], "inherit": false } }
```

### LineItem (existing, already has fields)
```python
calendar_mode: str = "inherit"  # "inherit" | "custom"
phase_details: Optional[Dict] = Field(default={}, sa_column=Column(JSON))
# Shape: { "shoot": { "defaultHours": 10, "dates": [...] } }

# NEW FIELDS (add if missing):
breakdown_json: Optional[str]  # Stores API response breakdown
```

---

## 🚦 Implementation Priority

### P0 - Critical (Must Have)
- [ ] Labor hourly calculation with calendar
- [ ] Material calendar integration
- [ ] Calendar hierarchy resolution
- [ ] Fringe calculation
- [ ] Real-time updates with debounce
- [ ] Tooltip breakdowns

### P1 - High (Should Have)
- [ ] Calendar override persistence
- [ ] Error handling & fallbacks
- [ ] Unit tests
- [ ] Performance optimization

### P2 - Medium (Nice to Have)
- [ ] Loading indicators
- [ ] Warning for missing calendar
- [ ] Enhanced tooltips

### P3 - Low (Future)
- Conflict detection
- Audit trail
- Bulk operations
- Multi-currency

---

## 📚 Reference Documents

1. **LABOR_MATERIAL_CALCULATION_SPEC.md** - Full specification (this)
2. **IMPLEMENTATION_ROADMAP.md** - Detailed tasks & timeline
3. **pay_rules_reference.md** - Authoritative pay rules
4. **models.py** - Database schema
5. **rate_lookup_service.py** - Existing calculation logic

---

## ❓ Quick Decision Reference

| Question | Answer |
|----------|--------|
| Daily rate weekend penalties? | NO - all-in |
| Partial week rounding? | Pro-rata (exact) |
| Flat rate fringes? | NO |
| Per-day OT calculation? | YES (independent days) |
| When persist calendar? | Immediately on save |
| Casual loading order? | BEFORE overtime |
| Holiday override allowed? | NO (compliance) |
| Display hourly or weekly? | Hourly |
| Missing calendar behavior? | Use defaults |
| Calculation trigger? | Real-time (500ms) |

---

**Questions?** Reference full spec or contact dev team lead.

**Status:** ✅ APPROVED - Ready for Development
