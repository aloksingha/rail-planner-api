"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../prisma");
async function run() {
    try {
        const users = await prisma_1.prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });
        console.log("=== DB USERS ===");
        users.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role} | Status: ${u.status}`);
        });
        process.exit(0);
    }
    catch (e) {
        console.error("Error checking users:", e);
        process.exit(1);
    }
}
run();
