import jwt from 'jsonwebtoken';

const JWT_SECRET = "super-secret-jwt-key";
const testUser = {
    id: "test-user-id-placeholder", // The actual ID will be created in DB on first bypass call
    email: "test@ticketspro.in",
    role: "CUSTOMER",
    name: "Test Payment User"
};

const token = jwt.sign(
    { userId: testUser.id, email: testUser.email, role: testUser.role, name: testUser.name },
    JWT_SECRET,
    { expiresIn: '7d' }
);

console.log('--- TEST LOGIN COMMAND ---');
console.log('Run this in your browser console (F12 -> Console):');
console.log(`localStorage.setItem("token", "${token}"); window.location.reload();`);
console.log('---------------------------');
