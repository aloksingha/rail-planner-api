const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function testDeduplication() {
    const baseUrl = 'http://localhost:5000/api/failed-bookings';
    const testData = {
        name: "Test User",
        email: "test@example.com",
        mobile: "9999999999", // Key field
        trainName: "Test Express",
        trainNumber: "12345", // Key field
        source: "HWH",
        destination: "NDLS",
        journeyDate: "2026-04-01", // Key field
        trainClass: "SL",
        reason: "Initial Failure"
    };

    console.log("--- Recording First Failure ---");
    try {
        const res1 = await axios.post(baseUrl, testData);
        console.log("Response 1:", res1.data);
        const id1 = res1.data.id;

        console.log("\n--- Recording Second Failure (within seconds) ---");
        const res2 = await axios.post(baseUrl, { ...testData, reason: "Second Failure (Attempt 2)" });
        console.log("Response 2:", res2.data);
        const id2 = res2.data.id;

        if (id1 === id2 && res2.data.updated === true) {
            console.log("\n✅ SUCCESS: Deduplication confirmed. IDs match and second request was marked as updated.");
        } else {
            console.log("\n❌ FAILURE: Deduplication did not work. IDs differ or 'updated' flag missing.");
            console.log(`ID 1: ${id1}, ID 2: ${id2}`);
        }
        
    } catch (e) {
        console.error("Test failed with error:", e.message);
        if (e.response) console.error("Response data:", e.response.data);
    } finally {
        await prisma.$disconnect();
    }
}

testDeduplication();
