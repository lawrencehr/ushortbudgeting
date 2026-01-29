
import { calculateDailyCost } from './lib/labor-calculation/pay-rules';
import { calculateOnCosts } from './lib/labor-calculation/on-costs';

console.log("--- TEST: Crew Mon-Fri 10h ---");
// Crew: 1.0x (7.6h) + 1.5x (2.0h) + 2.0x (0.4h)
// 7.6 + 3.0 + 0.8 = 11.4 pay hours
// Base $50 -> $570
const res1 = calculateDailyCost(10, 50, 'crew', false, 'weekday');
console.log(`Expected: $570. Actual: $${res1.totalPay}`);
console.log(`Base: ${res1.basePay}, OT: ${res1.overtimePay}`);

console.log("\n--- TEST: Artist Mon-Fri 10h ---");
// Artist: 1.0x (7.6) + 1.5x (2.0) + 2.0x (0.4) -- SAME as Crew for Perm Mon-Fri in this spec
const res2 = calculateDailyCost(10, 50, 'artist', false, 'weekday');
console.log(`Expected: $570. Actual: $${res2.totalPay}`);

console.log("\n--- TEST: Crew Sat 10h ---");
// Crew Sat Perm: 1.5x (7.6) + 1.75x (2.0) + 2.0x (0.4)
// (11.4) + (3.5) + (0.8) = 15.7 pay hours
// 15.7 * 50 = 785
const res3 = calculateDailyCost(10, 50, 'crew', false, 'saturday');
console.log(`Expected: $785. Actual: $${res3.totalPay}`);

console.log("\n--- TEST: On-Costs ---");
const onCosts = calculateOnCosts(1000);
console.log(`Total Labor $1000. Super (11.5%): ${onCosts.superannuation}. PayrollTax (4.85%): ${onCosts.payrollTax}`);

