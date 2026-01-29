# Walkthrough: Verifying Inclusive Totals

## Overview
This walkthrough confirms that Line Item totals now include fringes.

## Steps

### 1. Observe Initial State
1. Load the budget.
2. Find **Camera Operator**.
3. Note the Total. (If it hasn't recalculated yet, it might still show the old Gross value ~6.3k).

### 2. Trigger Update
1. Toggle the **Pre** phase OFF.
2. Toggle the **Pre** phase ON.
3. This forces a recalculation using the new logic.

### 3. Verify Inclusive Total
1. Check the new Total.
2. **Expected**: It should be noticeably higher than the Gross.
   - Approx Gross: $6,342 (for 2 Prep/4 Shoot/6 Post).
   - Plus Fringes (~20% est): +$1,200.
   - **Target Total**: ~$7,500 - $7,700.
3. Hover over the Total to seeing the breakdown.
   - The breakdown lists Prep/Shoot/Post costs (Gross).
   - And "Fringes".
   - Confirm the math: `Sum(Breakdown) + Sum(Fringes) ≈ Displayed Total`.

### 4. Verify Phase Scaling
1. Toggle **Pre** OFF.
2. Verify the Total drops by *more* than just the Prep Gross.
   - It should drop by (Prep Gross + Prep Portion of Fringes).
