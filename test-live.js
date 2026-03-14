const axios = require('axios');

async function testLiveStats() {
    try {
        const loginRes = await axios.get('https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN');
        const token = loginRes.data.token;
        console.log('Got live token:', token.substring(0, 20) + '...');

        const statsRes = await axios.get('https://rail-planner-api.onrender.com/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success!', Object.keys(statsRes.data));
    } catch (error) {
        if (error.response) {
            console.log('Server Error Status:', error.response.status);
            console.log('Server Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Local Error:', error.message);
        }
    }
}

testLiveStats();
