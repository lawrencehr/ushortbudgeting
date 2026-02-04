# Walkthrough: Checkpoint 3 - Calendar Persistence & Reset

## Summary
This checkpoint focused on fixing the persistence of calendar overrides for groupings and adding a mechanism to reset these overrides to global defaults.

## Changes

### 1. Persistence Fixes regarding Group Calendar Overrides
- **Backend**: 
    - Updated `save_budget` in `main.py` to persist `calendar_overrides`.
    - Added `PATCH /api/budget/groupings/{id}` endpoint to allow granular updates.
- **Frontend**:
    - Updated `LaborProvider` to load overrides from the budget on startup.
    - Enhanced `updateGroupingOverride` to save changes immediately via the new PATCH endpoint.
    - Refactored `DepartmentSettingsPopover.tsx` to prevent race conditions during save.

### 2. Reset Functionality
- **Implementation**: Added a "Reset" button (counter-clockwise arrow) to the `PhaseOverridePopover`.
- **Behavior**: Clicking "Reset" sets the local form state to match the global calendar configuration and marks all phases as `inherit: true`.
- **Result**: Saving after a reset removes the override status, reverting the group icon from amber (override active) to slate (default/inherited).

## How to Verify
1.  **Open the App**: Navigate to the budget view.
2.  **Set an Override**: Click a group calendar icon, select some dates, and save.
    -   *Confirmation*: The icon turns amber.
3.  **Refresh Page**: Reload the browser.
    -   *Confirmation*: The icon remains amber, and clicking it shows your preserved changes.
4.  **Reset Override**:
    -   Open the overridden group tooltip.
    -   Click the **Reset** button (arrow icon) in the bottom left footer.
    -   Click **Save**.
    -   *Confirmation*: The icon turns back to slate gray, indicating the group is now using global defaults.
