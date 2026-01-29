# Fix Report: Total & Unit Persistence

## Issue Investigated
User reported that changing a line item Unit to "HR" and calculating totals worked initially, but navigating away and returning (reloading budget) caused:
1. Unit to reset to "DAY".
2. Totals/Tooltips to potentially degrade.

## Root Cause Analysis
- **Unit Reset**: The `save_budget` endpoint in `backend/main.py` was **missing the assignment** for `db_item.unit`. It was only setting it on initial creation (default 'day'). Updates from the frontend were ignored by the backend.
- **Tooltip Data Loss**: The detailed breakdown (`breakdown_json`) needed for the tooltip was not being saved to the database. The frontend would lose this data on reload, requiring a re-calculation to see the tooltip again.

## Fix Implemented
1. **Backend Model**: Updated `LineItem` in `models.py` to include `breakdown_json` and `fringes_json` columns.
2. **Persistence Logic**: Updated `save_budget` in `main.py` to:
   - Explicitly save the `unit` field from the payload.
   - Save `breakdown_json` and `fringes_json`.
3. **Database Migration**: Applied schema change to `shortkings.db` to add the new columns.

## Verification
- **Unit**: Should now persist as "HR" after page reload.
- **Tooltip**: Should now appear immediately on page load without needing to edit the item, as the calculation data is loaded from DB.

## Next Steps for User
- Refresh the page.
- Set Unit to HR and Save.
- Navigate away and back -> Change should persist.
