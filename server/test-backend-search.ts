import axios from 'axios';

async function testSearch() {
    try {
        const res = await axios.get('http://localhost:5000/api/trains/getTrainOn', {
            params: {
                from: 'NDLS',
                to: 'SMVB',
                date: '26-03-2026'
            }
        });
        console.log('Search Result Count:', res.data.data.length);
        if (res.data.data.length > 0) {
            console.log('First Train Example:', JSON.stringify(res.data.data[0], null, 2));
        }
    } catch (e: any) {
        console.error('Search Failed:', e.response?.data || e.message);
    }
}

testSearch();
