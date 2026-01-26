# Implementation Plan - Smart Labor Engine

## Objective
Upgrade the existing labor calculation features to a "Smart Labor Engine" that supports detailed labor cost composition (Base + OT + Allowances) and centralized Crew List management.

## Phase 1: Data Modeling & Backend (Python/FastAPI)

### 1.1 Enhancing Labor Models
Update `backend/main.py`.
- **New Model `LaborAllowance`**:
  - `name` (e.g., "Meal Money", "Kit Rental")
  - `amount` (Daily amount)
  - `frequency` (Per Day, Per Week)
- **New Model `CrewMember`**:
  - `id` (UUID)
  - `name`
  - `role`
  - `base_rate`
  - `default_allowances` (List of LaborAllowance)
  - `overtime_rule_set` (Standard, 10h Day, etc.)
- **Update `BudgetLineItem`**:
  - Add optional `crew_member_id` field.
  - Add `allowances` list field to store specific allowances for this line item.

### 1.2 Enhanced Calculation Endpoint
Refactor `calculate_weekly_labor_rate` (and `/api/calculate-labor`):
- **Inputs**:
  - Base Rate
  - Daily Hours
  - Days Per Week
  - Overtime Configuration (e.g., { "1.5x_after": 8, "2.0x_after": 10 })
  - Allowances List (summed into the weekly total or kept separate?) -> Usually allowances are non-fringeable or have different tax rules, but for now we will sum them into a `gross_weekly` figure but potentially track them separately.

### 1.3 Crew Management API
- **Endpoints**:
  - `GET /api/crew`: List all crew.
  - `POST /api/crew`: Create new crew member.
  - `PUT /api/crew/{id}`: Update crew member.
  - `DELETE /api/crew/{id}`: Delete.
- **Storage**: `crew_data.json`

## Phase 2: Frontend Components (React/Next.js)

### 2.1 Crew Management Page
- Create `budget-app/frontend/app/crew/page.tsx`
- **Features**:
  - Table view of current crew.
  - "Add Crew" Modal (Name, Role, Base Rate, Default Allowances).

### 2.2 Refactored Labor Calculator
Update `budget-app/frontend/components/LaborCalculator.tsx`:
- **Mode Toggle**: "Simple" vs "Detailed".
- **Detailed Mode**:
  - **Inputs**: Base Rate, Hours, Days.
  - **Overtime Visualizer**: Show a bar breaking down 1X, 1.5X, 2.0X hours.
  - **Allowances Section**: Dynamic list of allowances (Add Row: Name, Amount).
  - **Crew Link**: Dropdown to "Load from Crew List". selecting a crew member auto-fills the fields.

### 2.3 Budget Integration
- In `BudgetTable` (or main page):
  - When a line item is "Labor", allow opening the enhanced `LaborCalculator`.
  - Display a "Person/Crew" column or indicator if linked to a crew member.

## Phase 3: Integration & Polish
- **Sync**: Ensure that updating a Crew Member raises a flag or option to update all linked budget lines.
- **UX**: Visual polish using the existing design system (Tailwind).
