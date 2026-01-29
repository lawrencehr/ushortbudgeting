# Implementation Plan: Inclusive Line Totals

## Architecture Update

### Legacy Logic (Previous)
- **Line Item Total**: Reflected Gross Pay (Base + Overtime + Penalties) only.
- **Sub-Total**: Calculated as `Sum(Item Totals) + Sum(Item Fringes)`.
- **Display**: Users saw Gross Pay on the line, but the Category Total included fringes. This was confusing.

### New Logic (Current)
- **Line Item Total**: Reflects **Inclusive Cost** (Gross Pay + Fringes).
- **Sub-Total**: Calculated as `Sum(Item Totals)`.
- **Fringe Calculation**:
  - The backend returns fringes for the full calendar (`res.fringes`).
  - The frontend calculates the "Active Portion" based on which phases are enabled.
  - `Active Fringes = Total Fringes * (Active Gross / Total Gross)`.
  - This ensures fringes scale correctly if users toggle off phases (e.g. removing Prep days).

## Files Modified
- `frontend/components/BudgetSheet.tsx`:
  - `handleLaborRecalc`: Implemented the scaling logic and update of `total`.
  - `updateItemLocal`: Simplified aggregation to remove double-counting.

## Data Schema
- No schema changes.
- **Semantic Change**: The `total` column in the `LineItem` database table will now represent the Inclusive Total rather than Gross Total for Labor items.
