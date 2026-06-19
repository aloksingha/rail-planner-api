import { getTicketPrice } from './src/utils/pricing';

// Mock data based on the discovered corridor
const mockCorridors = [
  {
    "id": "7668b55d-3571-4648-9f37-142f9b877232",
    "name": "KOLKATA-BANGALORE",
    "originStations": "[\"HWH\",\"KOAA\",\"SDAH\",\"BDC\",\"KGP\",\"SHM\"]",
    "destinationStations": "[\"SBC\",\"BNC\",\"YPR\",\"BYPL\",\"KJM\",\"SMVB\"]",
    "markupSL": 2200,
    "markup3A": 3600,
    "markup2A": 4300
  }
];

function test() {
    console.log("--- Testing Premium Train (Duronto) on HWH-SMVB corridor ---");
    const premiumPrice = getTicketPrice(
        "HWH", 
        "SMVB", 
        "SL", 
        "SMVT Bengaluru Duronto Express", 
        "29:05", 
        mockCorridors as any
    );
    console.log(`Result: ${premiumPrice} (Expected: 0)`);

    console.log("\n--- Testing Standard Train on HWH-SMVB corridor ---");
    const standardPrice = getTicketPrice(
        "HWH", 
        "SMVB", 
        "SL", 
        "HWH MYS EXP", 
        "29:05", 
        mockCorridors as any
    );
    console.log(`Result: ${standardPrice} (Expected: 2200)`);

    if (premiumPrice === 0 && standardPrice === 2200) {
        console.log("\n✅ VERIFICATION SUCCESSFUL: Premium trains are now prioritized for 'Price on Request'.");
    } else {
        console.log("\n❌ VERIFICATION FAILED.");
        process.exit(1);
    }
}

test();
