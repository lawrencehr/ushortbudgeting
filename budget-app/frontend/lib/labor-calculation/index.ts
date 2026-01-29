import { calculateDailyCost, CategoryRuleType } from './pay-rules';
import { calculateOnCosts, OnCostResult } from './on-costs';
import { PhaseConfig } from '@/lib/labor-context'; // Using context types

/**
 * Result for a single line item
 */
export interface LineItemCalculation {
    totalLabor: number;
    totalFringes: number;
    grandTotal: number;
    breakdown: {
        base: number;
        overtime: number;
        fringes: OnCostResult;
    };
    daysCount: number;
}

export interface CalculationInput {
    rate: number; // Base Hourly Rate
    isCasual: boolean;
    categoryType: CategoryRuleType;

    // Phase Data (Effective, fully resolved from context)
    activePhases: {
        pre: boolean;
        shoot: boolean;
        post: boolean;
    };
    phaseConfigs: {
        pre: PhaseConfig;
        shoot: PhaseConfig;
        post: PhaseConfig;
    }
}

/**
 * Determines day type from a date string.
 * Very basic MVP implementation: Uses JS Date.getDay()
 * 0=Sun, 6=Sat. 
 * Public Holiday lookup would happen here in a real app.
 */
function getDayType(dateStr: string): 'weekday' | 'saturday' | 'sunday' | 'pubhol' {
    const d = new Date(dateStr);
    const day = d.getDay();
    if (day === 0) return 'sunday';
    if (day === 6) return 'saturday';
    // TODO: Pub Hol Check
    return 'weekday';
}

export function calculateLineItemTotal(input: CalculationInput): LineItemCalculation {
    let totalLabor = 0;
    let totalBase = 0;
    let totalOT = 0;
    let daysCount = 0;

    // Process each Active Phase
    const phases = [
        { key: 'pre', active: input.activePhases.pre, config: input.phaseConfigs.pre },
        { key: 'shoot', active: input.activePhases.shoot, config: input.phaseConfigs.shoot },
        { key: 'post', active: input.activePhases.post, config: input.phaseConfigs.post },
    ];

    phases.forEach(p => {
        if (p.active && p.config) {
            const hours = p.config.defaultHours;
            const dates = p.config.dates || [];

            dates.forEach(dateStr => {
                daysCount++;
                const dayType = getDayType(dateStr);
                const dailyRes = calculateDailyCost(hours, input.rate, input.categoryType, input.isCasual, dayType);

                totalLabor += dailyRes.totalPay;
                totalBase += dailyRes.basePay;
                totalOT += dailyRes.overtimePay + dailyRes.penaltyPay;
            });
        }
    });

    const fringes = calculateOnCosts(totalLabor);

    return {
        totalLabor,
        totalFringes: fringes.totalOnCosts,
        grandTotal: totalLabor + fringes.totalOnCosts,
        breakdown: {
            base: totalBase,
            overtime: totalOT,
            fringes: fringes
        },
        daysCount
    };
}
