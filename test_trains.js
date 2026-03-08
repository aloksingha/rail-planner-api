const axios = require('axios');

const RAILRADAR_API_KEY = 'rr_l5kw3cdiu6tmfmg2mnq6zlbuoo9ff4pw';
const RAILRADAR_BASE_URL = 'https://api.railradar.org/api/v1';

async function testRailRadar() {
    try {
        console.log('Searching trains between NDLS and MUMBAI CENTRAL (MMCT)...');
        const res = await axios.get(`${RAILRADAR_BASE_URL}/trains/between?from=NDLS&to=MMCT&date=2026-03-20`, {
            headers: {
                'X-Api-Key': RAILRADAR_API_KEY,
                'Accept': 'application/json'
            }
        });

        let trains = res.data?.data?.trains || [];
        console.log(`Found ${trains.length} trains for NDLS-MMCT.`);

        if (trains.length > 0) {
            console.log('FULL Train Data from Search (First Train):');
            console.log(JSON.stringify(trains[0], null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.log(err.response.data);
    }
}

testRailRadar();
