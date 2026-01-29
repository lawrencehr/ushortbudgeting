# Calculation Verification Scenario: "Golden Rule"

This document serves as the high-fidelity source of truth for the labor calculation engine using the **January 2026** example.

## Configuration
- **Line Item**: Camera Operator
- **Base Rate**: $50.00 / Hour
- **Is Casual**: No
- **Is Artist**: No (Crew Rules Apply)

## Calendar Settings (Jan 2026)
| Phase | Days | Hours/Day | Dates |
|---|---|---|---|
| **Pre-Production** | 2 | 12h | Jan 4 (Sun), Jan 5 (Mon) |
| **Shooting** | 4 | 10h | Jan 13-16 (Tue-Fri) |
| **Post-Production** | 4* | 5h | Jan 23-26 (Fri-Mon) |

> [!NOTE]
> *User's example focuses on the first 4 days of Post-Production for the specific total calculation.

## Detailed Pay Breakdown

### 1. Pre-Production (12 Hour Days)
- **Jan 4 (Sun)**: `(7.6 * $50 * 1.75) + (4.4 * $50 * 2.0) = $665 + $440 = $1,105.00`
- **Jan 5 (Mon)**: `(7.6 * $50 * 1.0) + (2.0 * $50 * 1.5) + (2.4 * $50 * 2.0) = $380 + $150 + $240 = $770.00`
- **Phase Total**: **$1,875.00**

### 2. Shooting (10 Hour Days)
- **Mon-Thu (4 Days)**: `4 * [(7.6 * $50 * 1.0) + (2.0 * $50 * 1.5) + (0.4 * $50 * 2.0)] = 4 * [$380 + $150 + $40] = 4 * $570 = $2,280.00`
- **Phase Total**: **$2,280.00**

### 3. Post-Production (5 Hour Days)
- **Jan 23 (Fri)**: `5.0 * $50 * 1.0 = $250.00`
- **Jan 24 (Sat)**: `5.0 * $50 * 1.5 = $375.00`
- **Jan 25 (Sun)**: `5.0 * $50 * 1.75 = $437.50`
- **Jan 26 (Mon - PH)**: `5.0 * $50 * 2.5 = $625.00`
- **Phase Total**: **$1,687.50**

## Grand Totals
- **Labor Gross Total**: `$1,875.00 + $2,280.00 + $1,687.50 = $5,842.50`
- **Fringe Settings**:
  - Superannuation: 12.5% ($730.31)
  - Workers Comp: 1.0% ($58.43)
- **Fringe Total**: **$788.74**
- **GRAND TOTAL (Gross + Fringes)**: **$6,631.24**
