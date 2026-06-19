"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function test() {
    const liveApi = 'https://rail-planner-api.onrender.com';
    try {
        console.log('Logging in to live API as Super Admin...');
        const loginRes = await axios_1.default.post(`${liveApi}/api/auth/bypass`, {
            email: 'test@railplanner.in',
            password: 'admin1234'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token acquired:', token.substring(0, 15) + '...');
        console.log('Fetching dashboard-data...');
        const dashboardRes = await axios_1.default.get(`${liveApi}/api/admin/dashboard-data`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Dashboard Data response:', JSON.stringify(dashboardRes.data, null, 2));
    }
    catch (err) {
        if (err.response) {
            console.error('API Error Response:', err.response.status, err.response.data);
        }
        else {
            console.error('Network Error:', err.message);
        }
    }
}
test();
