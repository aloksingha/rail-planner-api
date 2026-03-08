const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
    const passwordHash = await bcrypt.hash('admin', 10);

    // Create 1 Admin
    await prisma.user.upsert({
        where: { email: 'admin1@tech.com' },
        update: { role: 'ADMIN' },
        create: { email: 'admin1@tech.com', passwordHash, role: 'ADMIN' }
    });

    // Create 3 Sales Managers
    for (let i = 1; i <= 3; i++) {
        await prisma.user.upsert({
            where: { email: `sales${i}@tech.com` },
            update: { role: 'SALES_MANAGER' },
            create: { email: `sales${i}@tech.com`, passwordHash, role: 'SALES_MANAGER' }
        });
    }

    // Create 25 Customers
    for (let i = 1; i <= 25; i++) {
        await prisma.user.upsert({
            where: { email: `customer${i}@tech.com` },
            update: { role: 'CUSTOMER' },
            create: { email: `customer${i}@tech.com`, passwordHash, role: 'CUSTOMER' }
        });
    }

    console.log('Successfully seeded dummy users');
}
main().catch(console.error).finally(() => prisma.$disconnect());
