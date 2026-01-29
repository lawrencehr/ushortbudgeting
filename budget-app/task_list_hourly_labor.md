# Task List: Hourly Labor Calculation Implementation

## Backend
- [x] **Created `labor_calculator_service.py`**:
    - Implemented `calculate_labor_cost` logic.
    - Added calendar hierarchy resolution (Global -> Grouping -> Overrides).
    - Integrated `rate_lookup_service` for exact Pay Rule calculations.
    - Added "Missing Calendar Fallback" to use default Mon-Fri dates if none set.
    - Implemented Fringe Calculation based on `fringe_settings`.
- [x] **Updated `main.py`**:
    - Registered POST `/api/calculate-labor-cost`.
    - Integrated service call.
    - Restored `ScheduleCostRequest` to fix regression.
- [x] **Verified Logic**:
    - Created `backend/scripts/verify_labor_calc.py`.
    - Validated scenarios: Defaults, Custom Dates, accurate Weekend penalties.

## Frontend
- [x] **Updated `lib/api.ts`**:
    - Added `calculateLaborCost` function.
    - Added `LaborCostRequest`, `LaborCostResponse` interfaces.
    - Added `breakdown_json` to `BudgetLineItem`.
    - Cleaned up duplicate interface members.
- [x] **Updated `BudgetSheet.tsx`**:
    - Refactored `handleLaborRecalc` to use new API.
    - Implemented logic to sum only active phases (Prep/Shoot/Post) for the Line Item Total.
    - Stores `breakdown_json` and `fringes_json` in the item.
- [x] **Updated `BudgetRow.tsx`**:
    - Added "Backend" mode to Tooltip.
    - Visualizes detailed breakdown (Days, Cost per phase).
    - Visualizes Fringe breakdown (Super, Tax, etc).
    - Visualizes inactive phases with strikethrough.

## Key Decisions & Notes
- **Total Display**: The Line Item "Total" column now reflects the *Gross Cost* of active phases. It does *not* include fringes (per standard budgeting).
- **Fringes**: Displayed separately in the Tooltip.
- **Rate Column**: For Hourly items, displays the Base Hourly Rate (not weekly).
- **Calc Trigger**: Triggers on `onBlur` of rate/casual fields for accuracy (Backend Pay Rules).
