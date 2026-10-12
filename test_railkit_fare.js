import 'dotenv/config';
import { configure, fareLookup } from "railkit";

const apiKey = process.env.RAILKIT_API_KEY || "railkit_cb0204e7cffc3b5cfaf811f6ca709344cae8f86899fd845a";
configure(apiKey);

async function testFareLookup() {
  console.log("------------------------------------------");
  console.log("Testing RailKit Fare Lookup");
  console.log("Train: 12904 | NZM -> BDTS | 18-10-2026 | 3A | GN");
  console.log("------------------------------------------");

  try {
    const result = await fareLookup(
      "12904", "NZM", "BDTS",
      "18-10-2026", "3A", "GN"
    );

    console.log("Raw Result:", JSON.stringify(result, null, 2));

    if (result && result.success) {
      const d = result.data;
      console.log(`\nTrain: ${d.trainName} (${d.trainNo})`);
      console.log(`Route: ${d.from} -> ${d.to} | ${d.distance} km`);
      console.log(`Fare Breakdown: Base: ₹${d.baseFare} | GST: ₹${d.gst} | Total: ₹${d.totalFare}`);
    } else {
      console.error("\nFare lookup was not successful.");
      if (result && result.error) {
        console.error("Error detail:", result.error);
      }
    }
  } catch (err) {
    console.error("Execution error:", err.message);
  }
}

testFareLookup();
