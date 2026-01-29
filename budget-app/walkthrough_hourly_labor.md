# Walkthrough: Hourly Labor Calculation

## How to Test

### 1. Basic Calculation (Inherit Mode)
1. Open the Budget App.
2. Add a new Line Item in "Camera - Crew".
3. Set description "Camera Operator".
4. Set Unit to **HR** (Hour).
5. Set Rate to **$50**.
6. Ensure **Prep**, **Shoot**, **Post** toggles are active (colored).
7. Hover over the **Total** column.
   - **Expectation**: Tooltip appears showing breakdown for Prep, Shoot, Post.
   - **Note**: If your project has no Global Calendar set, it falls back to defaults (Prep 10d, Shoot 20d, Post 10d).

### 2. Excluding Phases
1. Click the **Prep** ("Pre") button on the line item to toggle it OFF (gray).
2. The Total calculation should decrease immediately (or after short delay).
3. Hover over Total.
   - **Expectation**: "Prep" line in tooltip has a strikethrough, and its cost is not included in Total.

### 3. Casual Loading
1. Toggle the **Casual** Switch (Slider) to ON.
2. The Total should increase.
   - **Expectation**: The rate calculation now applies the 25% loading (handled by Backend Pay Rules).
   - *Note*: If the base rate was from an Award, the backend handles the lookup logic.

### 4. Custom Calendar Override
1. Click the **Calendar Icon** on the line item row.
2. In the popup, set "Shoot" to "Custom" and select specific dates (e.g. just 2 days).
3. Save.
4. The Total should drop significantly (reflecting only 2 days of Shoot).
5. Hover over Total -> "Shoot (2d)" should be visible.

## Troubleshooting
- **Total is $0?**: Check if "Prep/Shoot/Post" toggles are all off. Or if the Calendar has 0 days.
- **Rate didn't update?**: Click out of the input field (Blur) to trigger the backend calculation.
