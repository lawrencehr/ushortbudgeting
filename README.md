# Short-Form Drama Budgeting App

## Project Structure

This project is a full-stack application designed for Australian Production Accounting.

### Backend (Python/FastAPI)
Located in `backend/`.
- **`main.py`**: The core API server. Handles Excel import, Budget Logic, Fringe Engine calculations, and Data Persistence.
- **`fringe_settings.json`**: Stores global percentages (Super, Holiday Pay, etc.).
- **`budget_data.json`**: Stores the current state of the budget (created after first run).
- **`rates.json`**: Stores Pay Guide rates (if used for lookups).

### Frontend (React/Next.js)
Located in `budget-app/frontend/`.
- **`app/page.tsx`**: Summary Dashboard (Executive View).
- **`app/budget/page.tsx`**: Main Worksheet (Crew/Cast & Production Expenses).
- **`app/settings/page.tsx`**: Configuration for Fringe Percentages.
- **`lib/api.ts`**: API Client to communicate with the Python backend.

## Quick Start (Windows)

Simply double-click the **`start_app.bat`** file in the main folder. 
This will automatically:
1. Start the Python Backend.
2. Start the Frontend web server.
3. Open your default web browser to the app.

## How to Run (Manual)

### 1. Start the Backend
Open a terminal in the root directory:
```bash
uvicorn backend.main:app --reload --port 8000
```
*The backend will import the Excel file on first load if `budget_data.json` is missing.*

### 2. Start the Frontend
Open a **new** terminal in `budget-app/frontend`:
```bash
cd budget-app/frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features implemented
- **Automated Fringe Engine**: Toggles for Super (12.5%), Holiday Pay (8.33%), etc.
- **Relational Data**: Line items linked to Categories.
- **Summary Dashboard**: Real-time aggregation of ATL/BTL.
- **Contingency Calculator**: Automatically calculates based on BTL totals.
