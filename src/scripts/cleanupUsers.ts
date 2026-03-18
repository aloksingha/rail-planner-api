import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Starting User Cleanup ---');
    
    // 1. Identify temporary/dev bypass accounts
    const tempUsers = await prisma.user.findMany({
        where: {
            OR: [
                { passwordHash: 'DEV_BYPASS_ACCOUNT' },
                { email: { endsWith: '@tech.com' } },
                { email: { endsWith: '@ticketpro.dev' } },
                { email: { endsWith: '@example.com' } }
            ]
        }
    });

    console.log(`Found ${tempUsers.length} temporary accounts.`);

    if (tempUsers.length > 0) {
        // We delete them. Note: In a real app with relations, we'd need to handle cascading or deletions of related data.
        // For this project, we'll try to delete them directly. 
        // If there are constraints, we might need to delete bookings/etc first or just null them out.
        
        for (const user of tempUsers) {
            try {
                // Delete related records first to avoid foreign key constraints
                await prisma.booking.deleteMany({ where: { userId: user.id } });
                await prisma.refundRecord.deleteMany({ where: { userId: user.id } });
                await prisma.paymentRecord.deleteMany({ where: { userId: user.id } });
                await prisma.priceRequest.deleteMany({ where: { userId: user.id } });
                await prisma.auditLog.deleteMany({ where: { OR: [{ targetUserId: user.id }, { performedByUserId: user.id }] } });

                await prisma.user.delete({
                    where: { id: user.id }
                });
                console.log(`Deleted: ${user.email}`);
            } catch (err: any) {
                console.error(`Failed to delete ${user.email}:`, err.message);
            }
        }
    }

    console.log('--- Cleanup Complete ---');
    await prisma.$disconnect();
}

cleanup();
