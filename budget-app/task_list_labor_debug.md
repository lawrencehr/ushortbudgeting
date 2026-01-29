# Task List: Labor Calculation Debugging & Fix

## Overview
This task focused on resolving a discrepancy in labor cost calculations where the "Camera Operator" line item was totaling ~$19,600 instead of the expected ~$6,631. The root cause was identified as a missing `project_id` context, causing the backend to fallback to a generic, inflated calendar schedule.

## Steps Completed

### 1. Diagnosis & Investigation
- [x] **Reproduction**: Confirmed the incorrect total of $19,600 for Camera Operator in the browser.
- [x] **Backend Analysis**:
    - Created `check_db_calendar.py` to inspect database calendar entries.
    - Created `diag_api_calc.py` to isolate the API behavior.
    - Added debug logging to `labor_calculator_service.py` and `main.py`.
    - **Finding**: Backend was receiving "default-project-id" instead of the actual UUID.
- [x] **Frontend Analysis**:
    - Added debug logging to `BudgetSheet.tsx` and `BudgetRow.tsx`.
    - **Finding**: `BudgetSheet` was receiving "default-project-id" as a prop.
    - Traced the issue up to `app/budget/[categoryId]/page.tsx` which had a hardcoded placeholder.

### 2. Implementation of Fixes
- [x] **Frontend Fix**:
    - Modified `frontend/app/budget/[categoryId]/page.tsx` to fetch the active project ID using `fetchProjects()` instead of using a hardcoded placeholder.
    - Updated `frontend/app/budget/page.tsx` for consistency.
- [x] **Backend Logic**:
    - Cleaned up debug print statements in `main.py` and `labor_calculator_service.py`.
    - Retained the "default 10/20/10 days" fallback logic but functionality is now driven by correct project context.

### 3. Verification
- [x] **Browser Verification**:
    - Toggled "Pre" phase for Camera Operator.
    - Verified network request now contains a valid UUID for `project_id`.
    - Verified new calculated total is ~$6,342.50, which matches the project-specific calendar (2 Prep Days, 4 Shoot Days, 6 Post Days).

### 4. Cleanup
- [x] **Code Cleanup**: Removed all temporary console logs and python print statements.
- [x] **File Cleanup**: Removed diagnostic scripts (`check_db_calendar.py`, `diag_api_calc.py`).

## Outcome
The labor calculation logic is now correctly linked to the active project's calendar settings. Line items now reflect safe, project-specific default hours and days.
