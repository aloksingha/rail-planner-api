const axios = require('axios');

async function testBackendSearch() {
    try {
        const date = '2026-03-20'; // This is a Friday
        console.log(`Testing backend search for date: ${date} (Friday)`);

        const res = await axios.get(`http://localhost:5000/api/trains/getTrainOn?from=NDLS&to=MMCT&date=${date}`);

        if (res.data.success) {
            const trains = res.data.data;
            console.log(`Success! Found ${trains.length} trains.`);
            if (trains.length > 0) {
                const head = trains[0].train_base;
                console.log('Sample Train (train_base):', JSON.stringify(head, null, 2));

                // Check if train_type is present
                if (head.train_type) {
                    console.log('✔ train_type is present:', head.train_type);
                } else {
                    console.log('✘ train_type is MISSING');
                }
            }
        } else {
            console.log('Backend search failed:', res.data.data);
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.log(err.response.data);
    }
}

testBackendSearch();
