const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = "super-secret-jwt-key";
const adminUser = {
    id: "456ebe5e-363c-477d-b9fb-9f93074e5a7b",
    email: "aloksingha.2017@gmail.com",
    role: "ADMIN",
    name: "Alok Singha"
};

const token = jwt.sign(
    { userId: adminUser.id, email: adminUser.email, role: adminUser.role, name: adminUser.name, isSuperAdmin: true },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function check() {
    try {
        console.log("Querying production backend dashboard-data...");
        const { data } = await axios.get('https://rail-planner-api.onrender.com/api/admin/dashboard-data', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Dashboard response stats:", data.stats);
    } catch (e) {
        console.error("Error calling API:", e.response ? e.response.data : e.message);
    }
}

check();
