/**
 * Labor Entry V2 - On-Costs Engine
 * Implements Section 4.3 (Super, Payroll Tax, Workers Comp)
 */

export interface OnCostsConfig {
    superRate: number; // e.g., 0.115
    payrollTaxRate: number; // e.g., 0.0485
    workersCompRate: number; // e.g., 0.03
    payrollTaxThreshold?: number; // Ignored for MVP usually, but good to have
}

export interface OnCostResult {
    superannuation: number;
    payrollTax: number;
    workersComp: number;
    totalOnCosts: number;
}

const DEFAULT_CONFIG: OnCostsConfig = {
    superRate: 0.115,      // 11.5%
    payrollTaxRate: 0.0485, // 4.85%
    workersCompRate: 0.03   // 3% (Estimate)
};

export function calculateOnCosts(totalLaborCost: number, config: OnCostsConfig = DEFAULT_CONFIG): OnCostResult {
    // Superannuation usually checked against a max contribution base, but for budgeting we assume flat rate on OTE.
    // NOTE: Techincally Super is on "Ordinary Time Earnings" (OTE). 
    // This simple calculator applies it to the WHOLE Calc usually, or we need to pass Base vs OT.
    // For MVP budgeting, standard industry practice is often % of Total Gross. 
    // Let's be safer and apply to Total Gross. 

    // Actually, usually OT is NOT OTE. 
    // Spec doesn't specify. Standard Australian rule: Super on OTE (Base + Casual Loading + Shift Allowances, NOT OT).
    // However, simplicity -> Total * Rate is conservative/safe budget.

    const superAmt = totalLaborCost * config.superRate;
    const ptAmt = totalLaborCost * config.payrollTaxRate;
    const wcAmt = totalLaborCost * config.workersCompRate;

    return {
        superannuation: superAmt,
        payrollTax: ptAmt,
        workersComp: wcAmt,
        totalOnCosts: superAmt + ptAmt + wcAmt
    };
}
