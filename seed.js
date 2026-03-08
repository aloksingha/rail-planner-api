const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
    const passwordHash = await bcrypt.hash('admin', 10);
    await prisma.user.upsert({
        where: { email: 'alokjnv.singha3@gmail.com' },
        update: { role: 'SUPER_ADMIN', passwordHash },
        create: { email: 'alokjnv.singha3@gmail.com', passwordHash, role: 'SUPER_ADMIN' }
    });
    console.log('Successfully added Super Admin');
}
main().catch(console.error).finally(() => prisma.$disconnect());
