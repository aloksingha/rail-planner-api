const axios = require('axios');

async function testSearch() {
    try {
        console.log('Testing flight search endpoint...');
        const response = await axios.get('http://localhost:5000/api/flights/search', {
            params: {
                sourceCode: 'DEL',
                destCode: 'BOM',
                date: '2026-03-20',
                tripType: 'oneway',
                adults: '1',
                cabinClass: 'economy',
                currency: 'INR'
            }
        });
        console.log('Response Status:', response.status);
        console.log('Success:', response.data.success);
        console.log('Result Count:', response.data.count);
        console.log('Is Mock:', response.data.isMock);
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testSearch();
