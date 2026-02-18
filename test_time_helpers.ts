
import { getTimeSlots, getTopOffset, formatTimeDisplay } from './src/components/business/agenda/TimeGridHelpers';

// Mock getTopOffset if it depends on browser environment? No, it's pure logic.
// But it is imported relative to script location.

console.log("Testing 12h Format Slots:");
const slots12 = getTimeSlots('12h');
console.log(slots12.slice(0, 4)); // Should be 12:00 AM, 12:30 AM, 1:00 AM...
console.log(slots12.slice(24, 28)); // Should be 12:00 PM...

console.log("\nTesting 24h Format Slots:");
const slots24 = getTimeSlots('24h');
console.log(slots24.slice(0, 4)); // Should be 00:00, 00:30, 01:00...

console.log("\nTesting getTopOffset:");
// 10:00 AM -> 10 * 100 = 1000
console.log(`10:00 AM (12h): ${getTopOffset("10:00 AM")} (Expected: 1000)`);
// 10:00 (24h) -> 10 * 100 = 1000
console.log(`10:00 (24h): ${getTopOffset("10:00")} (Expected: 1000)`);
// 2:30 PM -> (14 * 100) + (30/60 * 100) = 1400 + 50 = 1450
console.log(`2:30 PM (12h): ${getTopOffset("2:30 PM")} (Expected: 1450)`);
// 14:30 -> 1450
console.log(`14:30 (24h): ${getTopOffset("14:30")} (Expected: 1450)`);
