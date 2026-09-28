"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function listUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}
listUsers();
