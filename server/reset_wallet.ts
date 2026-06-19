import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('Fetching users with name containing Test...');
    const users = await prisma.user.findMany({ where: { name: { contains: 'Test' } }});
    console.log('Found:', users.map(u => u.name));

    for (const user of users) {
        console.log(`Resetting balance for ${user.name} (${user.id})`);
        
        // Delete transactions
        const txsDeleted = await prisma.walletTransaction.deleteMany({
            where: { userId: user.id }
        });
        console.log(`Deleted ${txsDeleted.count} transactions.`);

        // Delete withdrawal requests
        const withdrawalsDeleted = await prisma.withdrawalRequest.deleteMany({
            where: { userId: user.id }
        });
        console.log(`Deleted ${withdrawalsDeleted.count} withdrawal requests.`);

        // Set balance to 0
        await prisma.user.update({
            where: { id: user.id },
            data: { walletBalance: 0 }
        });
        console.log(`Balance reset to 0.`);
    }

    console.log('Done!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
