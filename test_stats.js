const axios = require('axios');

async function testStats() {
    try {
        const liveApi = 'https://rail-planner-api.onrender.com';
        console.log('Logging in to live API as Super Admin...');

        const loginRes = await axios.get(`${liveApi}/api/auth/dev-bypass-token/SUPER_ADMIN`);

        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        console.log('Fetching stats...');
        const statsRes = await axios.get(`${liveApi}/api/admin/stats`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Stats fetched successfully:');
        console.log(statsRes.data);

    } catch (err) {
        if (err.response) {
            console.error('API Error Response:', err.response.status, err.response.data);
        } else {
            console.error('Network Error:', err.message);
        }
    }
}

testStats();
