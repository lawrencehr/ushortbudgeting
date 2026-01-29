# Implementation Plan - Hourly Labor Calculation

## Architecture Overview
The solution shifts heavy calculation logic from Frontend to Backend to leverage the complex Pay Rules engine (`rate_lookup_service`) and Calendar awareness.

### Data Flow
1. **User Action**: Edits Rate, Toggles Casual, or changes Calendar/Phases in Frontend.
2. **Trigger**: `handleLaborRecalc` (BudgetSheet) is called via `onBlur` or debounced effect.
3. **Request**: `LaborCostRequest` sent to `/api/calculate-labor-cost`.
   - Includes: `base_rate`, `calendar_mode`, `phase_details` (overrides), `project_id`.
4. **Backend Processing**:
   - Resolve Dates: Merges Global Calendar + Grouping Overrides + Item Overrides.
   - Apply Pay Rules: Iterates every date, checks Weekday/Saturday/Sunday/Holiday.
   - Calculate Cost: `hours * rate * multiplier`.
   - Calculate Fringes: `%` of Gross.
5. **Response**: `LaborCostResponse` with `total_cost` (Gross) and `breakdown` (Per Phase) + `fringes`.
6. **State Update**: Frontend updates `total`, `fringes_json`, `breakdown_json`.

## Component Changes

### Backend
- `labor_calculator_service.py`: Core logic hub.
    - **Fallback Logic**: If no calendar exists, generates strict Mon-Fri defaults (Prep 10d, Shoot 20d, Post 10d) to ensure non-zero returns for new projects.
- `main.py`: Endpoint exposure.

### Frontend
- `BudgetSheet.tsx`:
    - Logic to selectively sum `activeGross` based on `prep_qty`, `shoot_qty` etc.
    - This allows a Single Line Item to represent "Just Prep" or "Just Shoot" while still using the Project Calendar.
- `BudgetRow.tsx`:
    - Tooltip enhanced to parse `breakdown_json`.
    - Shows "Strike-through" for phases that are calculated by backend but disabled for this line item.

## Verification Strategy
- **Script**: `backend/scripts/verify_labor_calc.py` confirmed backend mathematics.
- **Manual**: User can verify by:
    1. Adding a "Best Boy" line item.
    2. Setting Rate $50.
    3. Hovering Total -> See breakdown matching Defaults (10/20/10 days).
    4. Toggling "Casual" -> See rate/total jump ~25%.
    5. Changing Local Calendar (Custom) -> See total update.
