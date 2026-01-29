/**
 * Labor Entry V2 - Pay Rules Engine
 * Implements Section 4.2 of the Spec (Artist vs Crew Rules)
 */

export type CategoryRuleType = 'artist' | 'crew';

export interface DailyCostResult {
    basePay: number;
    overtimePay: number;
    penaltyPay: number; // Weekend / Holiday loadings
    totalPay: number;
    hours: number;
    effectiveHours: number; // After min call
}

const MINIMUM_CALL_HOURS = 4.0;

/**
 * Artist Rules (Category E)
 * Based on Broadcasting Award
 */
function calculateArtistPay(hours: number, baseRate: number, isCasual: boolean, dayType: 'weekday' | 'saturday' | 'sunday' | 'pubhol'): DailyCostResult {
    // Spec Update:
    // Artist Casual Mon-Sat: 1.25x (0-7.6), 1.875x (7.6-9.6), 2.5x (9.6+)
    // Artist Perm Mon-Sat: 1.0x (0-7.6), 1.5x (7.6-9.6), 2.0x (9.6+)

    let totalPay = 0;
    let basePay = 0;
    let overtimePay = 0;
    let penaltyPay = 0;

    const effHours = Math.max(hours, MINIMUM_CALL_HOURS);

    if (dayType === 'sunday') {
        // 2.0x All Hours
        const mult = 2.0;
        totalPay = effHours * baseRate * mult;
        penaltyPay = totalPay - (effHours * baseRate);
        basePay = effHours * baseRate;
    } else if (dayType === 'pubhol') {
        // 2.5x All Hours
        const mult = 2.5;
        totalPay = effHours * baseRate * mult;
        penaltyPay = totalPay - (effHours * baseRate);
        basePay = effHours * baseRate;
    } else {
        // Mon-Sat
        const t1 = Math.min(effHours, 7.6);
        const t2 = Math.max(0, Math.min(effHours - 7.6, 2.0)); // Next 2 hours (7.6 to 9.6)
        const t3 = Math.max(0, effHours - 9.6);

        // Multipliers
        let m1, m2, m3;
        if (isCasual) {
            m1 = 1.25;
            m2 = 1.875;
            m3 = 2.5;
        } else {
            m1 = 1.0;
            m2 = 1.5;
            m3 = 2.0;
        }

        const p1 = t1 * baseRate * m1;
        const p2 = t2 * baseRate * m2;
        const p3 = t3 * baseRate * m3;

        totalPay = p1 + p2 + p3;
        basePay = effHours * baseRate;

        // Difference is OT
        overtimePay = totalPay - basePay;
    }

    return {
        basePay,
        overtimePay,
        penaltyPay,
        totalPay,
        hours,
        effectiveHours: effHours
    };
}

/**
 * Crew Rules (Standard)
 */
function calculateCrewPay(hours: number, baseRate: number, isCasual: boolean, dayType: 'weekday' | 'saturday' | 'sunday' | 'pubhol'): DailyCostResult {
    let totalPay = 0;
    const effHours = Math.max(hours, MINIMUM_CALL_HOURS);
    const rawBase = effHours * baseRate;

    // Multipliers Config
    let m1 = 1.0, m2 = 1.5, m3 = 2.0; // Defaults Perm Mon-Fri

    if (dayType === 'pubhol') {
        const mult = isCasual ? 3.125 : 2.5;
        totalPay = effHours * baseRate * mult;
        return {
            basePay: rawBase,
            overtimePay: 0,
            penaltyPay: totalPay - rawBase,
            totalPay,
            hours,
            effectiveHours: effHours
        };
    }

    if (isCasual) {
        if (dayType === 'weekday') { m1 = 1.25; m2 = 1.875; m3 = 2.5; }
        else if (dayType === 'saturday') { m1 = 1.75; m2 = 2.1875; m3 = 2.5; }
        else if (dayType === 'sunday') { m1 = 2.0; m2 = 2.5; m3 = 2.5; }
    } else {
        if (dayType === 'weekday') { m1 = 1.0; m2 = 1.5; m3 = 2.0; }
        else if (dayType === 'saturday') { m1 = 1.5; m2 = 1.75; m3 = 2.0; }
        else if (dayType === 'sunday') { m1 = 1.75; m2 = 2.0; m3 = 2.0; }
    }

    const t1 = Math.min(effHours, 7.6); // spec says 0-7.6
    const t2 = Math.max(0, Math.min(effHours - 7.6, 2.0)); // next 2 (7.6-9.6)
    const t3 = Math.max(0, effHours - 9.6);

    totalPay = (t1 * baseRate * m1) + (t2 * baseRate * m2) + (t3 * baseRate * m3);

    return {
        basePay: rawBase,
        overtimePay: totalPay - rawBase, // Simplified
        penaltyPay: 0,
        totalPay,
        hours,
        effectiveHours: effHours
    };
}

/**
 * Main Calculation Function
 */
export function calculateDailyCost(
    hours: number,
    baseRate: number,
    categoryType: CategoryRuleType,
    isCasual: boolean,
    dayType: 'weekday' | 'saturday' | 'sunday' | 'pubhol' = 'weekday'
): DailyCostResult {
    if (categoryType === 'artist') {
        return calculateArtistPay(hours, baseRate, isCasual, dayType);
    } else {
        return calculateCrewPay(hours, baseRate, isCasual, dayType);
    }
}
