# Implementation Plan: Budget UI Revamp

## Objective
Revamp the "Normal Lines" (Budget Items) in the Budget Sheet to match the "Premium" aesthetics of the New Item UI (`InlineItemEditor`), while retaining necessary density and functionality.

## Core Interactive Changes
1.  **Format**: Switch from HTML `<table>` to CSS Grid (`div`-based layout).
2.  **Casual Input**: Turn the "Casual" Checkbox into a "Casual" Toggle Button (Pill/Badge style).
3.  **Visuals**: Upgrade text emojis (ℹ️, ⚙️, ✕) to `lucide-react` icons.
4.  **Styling**: Adopt `InlineItemEditor` tokens (Rounded corners, `bg-white`, `shadow-sm`, transparent inputs).

## Component Architecture

### 1. New Component: `BudgetRow.tsx`
Isolate the row rendering logic from `BudgetSheet.tsx` to handle the complex layout and interactions cleanly.

**Props:**
- `item`: `BudgetLineItem`
- `onChange`: `(updates: Partial<BudgetLineItem>) => void`
- `onDelete`: `() => void`
- `onExpandInspector`: `() => void`
- `onRecalcLabor`: `() => void`

**Layout Strategy (Grid System - 12 Cols):**
*Alignment with a new `BudgetHeader` is critical.*

| Column | Span | Component Type | Style Reference |
| :--- | :--- | :--- | :--- |
| **Desc** | 3 | Styled Input | Matches `CatalogAutocomplete` container |
| **Notes** | 2 | Styled Italic Input | `text-slate-500 italic` |
| **Rate** | 3 | Rate/Hrs/Days Flex | Compact Group: `$/Hr` `Hrs` `Day` |
| **Cas** | 1 | **Toggle Button** | **New Feature**: "CAS" Badge that toggles |
| **Phases** | 2 | Qty Inputs | `Prp` `Sht` `Pst` (Styled as transparent numbers) |
| **Total** | 1 | Text Display | `font-bold font-mono` |
| **Opts** | ? | Icons | Inspector/Delete (Reveal on Hover) |

### 2. New Component: `BudgetHeader.tsx`
Create a grid-aligned header row to replace `<thead>`. Must exactly match `BudgetRow` grid definition.

### 3. Modifications: `BudgetSheet.tsx`
- Replace `<table>` loop with `<div className="space-y-1">`.
- Refactor `updateItemLocal` to be passed as a clean `onChange` callback.
- Import `BudgetRow` and `BudgetHeader`.

## Dependencies & Controls
- **Icons**: `lucide-react` (Lock, Trash, Briefcase, User).
- **Logic**: Ensure `calculateLaborRate` results are correctly propagated via the `onChange` handler.
- **Animation**: Use `framer-motion` for row entrance/exit.

## "Casual" Button Spec
- **Active (Casual)**: `bg-indigo-100 text-indigo-700 border-indigo-200`
- **Inactive (Perm)**: `bg-slate-50 text-slate-300 border-slate-100`
- **Click**: Triggers `onChange({ is_casual: !val })` -> Triggers Recalc.

## Questions vs Assumptions
*This plan makes the following assumptions which need user confirmation:*
1.  **Density**: We act to **keep** the detailed columns (Notes, Hrs, Days) visible but clean them up, rather than hiding them like the "New Item" simple mode.
2.  **Phases**: We keep the specific **Quantity Inputs** (e.g. "5 days") rather than switching to the "New Item" boolean toggles.
