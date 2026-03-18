import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
