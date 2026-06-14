import axios from 'axios';

async function test() {
  const liveApi = 'https://rail-planner-api.onrender.com';
  try {
    console.log('Logging in to live API as Super Admin...');
    const loginRes = await axios.post(`${liveApi}/api/auth/bypass`, {
      email: 'test@railplanner.in',
      password: 'admin1234'
    });

    const token = loginRes.data.token;
    console.log('Login successful. Token acquired:', token.substring(0, 15) + '...');

    console.log('Fetching dashboard-data...');
    const dashboardRes = await axios.get(`${liveApi}/api/admin/dashboard-data`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Dashboard Data response:', JSON.stringify(dashboardRes.data, null, 2));

  } catch (err: any) {
    if (err.response) {
      console.error('API Error Response:', err.response.status, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
  }
}

test();
