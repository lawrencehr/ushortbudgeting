# Task List: Inclusive Line Totals

## Overview
The user requested that budget line item totals be **inclusive** of fringes, rather than having fringes added only at the category sub-total level.

## Changes Implemented

### 1. Frontend Logic (`BudgetSheet.tsx`)
- [x] **`handleLaborRecalc` Update**:
    - Modified to calculate `activeFringeAmount` based on the ratio of `activeGross` (enabled phases) to `res.total_cost` (total calendar cost).
    - Sets `updates.total` to `activeGross + activeFringeAmount`.
    - Updates `fringes_json` with scaled fringe details to match the active proportion.
- [x] **`updateItemLocal` Update**:
    - Removed the logic that parsed `fringes_json` and added it to the sub-total.
    - Simplified the reducer to just sum `item.total` (which is now inclusive).

## Logic Verification
- **Scenario A (Standard)**: Phases match backend calendar. Ratio = 1.0. Total = Base + Fringes.
- **Scenario B (Partial)**: User toggles off "Prep". `activeGross` < `total_cost`. Fringes scale down proportionally. Total = Partial Base + Partial Fringes.

## Impact
- **Line Items**: Now display the full cost (Inc Fringes) in the Total column.
- **Sub-totals**: Calculated by summing the inclusive line totals.
- **Database**: Future saves will store the inclusive total in the `lineitem.total` column.
