# Implementation Plan: Labor Project Context Fix

## Problem Description
The labor cost calculator was returning inflated values ($19,600 vs ~$6,600) because the frontend was failing to pass the correct `project_id` to the backend. This forced the backend to use a "fallback" calendar with 40 total days (10 Prep, 20 Shoot, 10 Post) instead of the project's actual schedule (2 Prep, 4 Shoot, 6 Post).

## Architecture Changes

### Frontend (`frontend/app/budget/`)
1.  **Context Initialization**:
    - **File**: `app/budget/[categoryId]/page.tsx`
    - **Change**: Replaced the hardcoded `const activeProjectId = "default-project-id"` with a dynamic data fetch.
    - **Logic**: Uses `fetchProjects()` on mount to retrieve the first available project and uses its ID.
    - **Impact**: Initializes the `LaborProvider` and `BudgetSheet` with the correct Context ID.

2.  **Budget Sheet (`frontend/components/BudgetSheet.tsx`)**:
    - **Change**: Verified `projectId` prop propagation. (No structural changes needed, just verified).
    - **Cleanup**: Removed temporary debug logging.

### Backend (`backend/`)
1.  **Service Logic (`labor_calculator_service.py`)**:
    - **Status**: Logic remains the same, but now correctly receives valid `project_id`.
    - **Fallback**: The fallback mechanism (10/20/10 days) remains as a safety net but is no longer triggered for valid projects.
    - **Cleanup**: Removed field diagnostics and debug prints.

## Data Flow
**Before**:
`Page (default-id)` -> `BudgetSheet` -> `API Call (default-id)` -> `Backend (Fallback Calendar)` -> **Incorrect High Cost**

**After**:
`Page (fetch ID)` -> `BudgetSheet` -> `API Call (UUID)` -> `Backend (Project Calendar)` -> **Correct Cost**

## Future Considerations
- **Project Selection**: Currently defaults to `projects[0]`. In valid multi-project scenarios, this should ideally come from a URL param or a global context/store.
- **Error Handling**: If `fetchProjects` returns empty, the app currently falls back gracefully, but UI could be more explicit about "No Project Found".
