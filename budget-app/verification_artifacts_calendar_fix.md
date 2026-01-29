
# Task List

- [x] Analyze `frontend/app/settings/calendar/page.tsx` to identify date serialization issue.
- [x] Analyze `backend/main.py` to understand date parsing logic.
- [x] Create reproduction/verification script for backend API.
- [x] Implement fix in `frontend/app/settings/calendar/page.tsx` using `yyyy-MM-dd` format.
- [x] Verify fix with backend script.
- [x] Verify UI stability with Browser Agent.

# Implementation Plan

## Problem
The "Global Settings Calendar" was shifting dates by one day upon saving and reloading. This was caused by the frontend using `toISOString()` which converts local selected dates (e.g., Feb 1 00:00) to UTC (e.g., Jan 31 13:00) before sending. The backend, using naive parsing, stripped the timezone information but kept the date/time of the UTC value (Jan 31), effectively shifting the date back by one day for users in positive timezones (like AEST).

## Solution
Modified the frontend to serialize dates using the "yyyy-MM-dd" format instead of `toISOString()`. This ensures that the exact date selected by the user is sent to the backend without any timezone conversion.

## Architectural Changes
- **Frontend**: Updated `CalendarSettingsPage` in `frontend/app/settings/calendar/page.tsx` to use `date-fns`'s `format` function.
- **Backend**: No changes were required as Python's `datetime.fromisoformat` correctly parses "YYYY-MM-DD" strings (defaulting to midnight).

# Walkthrough

1.  Navigate to **Settings > Calendar**.
2.  Select specific dates for Pre-Prod, Shoot, or Post-Prod phases (e.g., enable August 15th).
3.  Click **Save Changes**.
4.  Navigate away from the page or refresh the browser.
5.  Return to the Calendar settings.
6.  **Verify**: The selected dates (August 15th) are still selected and have not shifted to the previous day (August 14th).
