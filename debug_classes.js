const axios = require('axios');

const RAILRADAR_API_KEY = 'rr_l5kw3cdiu6tmfmg2mnq6zlbuoo9ff4pw';
const RAILRADAR_BASE_URL = 'https://api.railradar.org/api/v1';

async function test() {
    try {
        console.log("Searching NDLS to HWH exactly how the backend does it...");
        const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/between?from=NDLS&to=HWH&date=15-03-2026`, {
            headers: {
                'X-Api-Key': RAILRADAR_API_KEY,
                'Accept': 'application/json'
            }
        });

        const trains = response.data?.data?.trains || [];
        console.log(`Found ${trains.length} trains.`);
        
        trains.forEach(t => {
            console.log(`\nTrain: ${t.trainNumber} - ${t.trainName}`);
            console.log('classes array:', t.classes);
            console.log('availableClasses array:', t.availableClasses);
            console.log('train_class_details:', t.train_class_details);
            console.log('availableClassCodes string:', t.availableClassCodes);
        });

    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}

test();
