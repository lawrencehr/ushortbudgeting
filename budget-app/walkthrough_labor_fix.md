# Walkthrough: Labor Calculation Fix Verification

## Overview
This walkthrough demonstrates how to verify that the labor rates are now calculating correctly based on the specific project calendar.

## Prerequisites
- Backend server running (`python main.py`).
- Frontend server running (`npm run dev`).

## Verification Steps

### 1. Access the Budget
1. Navigate to **http://localhost:3000/budget/C**.
2. Verify the page loads without errors.

### 2. Locate Target Item
1. Scroll to **C - Production Unit Fees & Salaries**.
2. Click to expand the category.
3. Look for **C.4 - Camera Crew**.
4. Find the **Camera Operator** line item.

### 3. Verify Calculation
1. **Initial State**: Check the current Total.
2. **Interact**:
   - Toggle the **Pre** phase button (Green "Pre" badge).
   - Toggle it OFF and then ON again.
3. **Observation**:
   - Watch the Total column update.
   - **Correct Result**: The total should settle around **$6,342.50**.
   - **Incorrect Result**: If it shows ~$19,600, the fix is not working (fallback calendar is active).

### 4. Technical Check (Optional)
1. Open Browser DevTools (F12).
2. Go to the **Network** tab.
3. Filter by `calculate-labor-cost`.
4. Trigger the update again.
5. Inspect the **Request Payload**.
6. Verify `project_id` matches a UUID (e.g., `912e2ea5...`) and is NOT `default-project-id`.

## Troubleshooting
- If the total remains high, ensure the backend server was restarted to clear any cached states (though not strictly necessary for this stateless fix).
- Ensure the database has the correct calendar entries for the project (2/4/6 days).
