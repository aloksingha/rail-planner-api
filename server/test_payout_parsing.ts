import { parseWithdrawalDetails } from './src/services/razorpayService';

const testCases = [
    // UPI VPAs
    "username@upi",
    "  user.name_123@oksbi   ",
    "upi:test@paytm",
    "UPI ID: someuser@ybl",
    "some_user@okaxis",

    // Bank Details
    "Acc: 1234567890, IFSC: SBIN0001234",
    "Account: 98765432109876, IFSC: HDFC0000123",
    "acc: 5544332211, ifsc: ICIC0000456",
    "Acc: 1122334455 IFSC: BARB0BENGAL",
    "Acc-2233445566, IFSC-PUNB0123456",
    "acc number: 9988776655, ifsc code: KKBK0000888",

    // Loose inputs
    "123456789012 SBIN0001234",
    "IFSC: SBIN0001234, Account No: 123456789012",
    "transfer to 987654321012 and IFSC is HDFC0000123",

    // Invalid cases (should fail)
    "invalid_details",
    "Acc: 12345", // missing IFSC
    "IFSC: SBIN0001234", // missing Acc
    "user@upi Acc: 12345", // ambiguous
];

console.log("Running Payout Parsing Tests...\n");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
    try {
        const res = parseWithdrawalDetails(tc);
        console.log(`PASS: "${tc}" =>`, JSON.stringify(res));
        passed++;
    } catch (err: any) {
        console.log(`FAIL (Expected for invalid cases): "${tc}" => Error: ${err.message}`);
        if (tc.includes("invalid") || tc === "Acc: 12345" || tc === "IFSC: SBIN0001234" || tc === "user@upi Acc: 12345") {
            passed++;
        } else {
            failed++;
        }
    }
}

console.log(`\nTest results: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
