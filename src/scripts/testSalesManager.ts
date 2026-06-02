import { prisma } from '../prisma';

async function test() {
    const userId = "bf52a149-7dd2-444f-99ca-77132d1409b6"; // Raju Rao
    const role = "SALES_MANAGER";

    try {
        console.log("Starting test for Sales Manager...");
        let paymentWhere: any = { status: 'CAPTURED', userId };
        let bookingWhere: any = { userId };
        let commissionWhere: any = { userId, type: 'CREDIT', description: { contains: 'Commission' } };

        console.log("Querying revenue stats...");
        const [revenueStats, recentBookings, commissionStats] = await Promise.all([
            prisma.paymentRecord.aggregate({
                where: paymentWhere,
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.booking.findMany({
                where: bookingWhere,
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: { select: { email: true, mobile: true } },
                    event: { select: { name: true } }
                }
            }),
            prisma.walletTransaction.aggregate({
                where: commissionWhere,
                _sum: { amount: true }
            })
        ]);

        console.log("Querying recent payments...");
        const recentPayments = await prisma.paymentRecord.findMany({
            where: paymentWhere,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        console.log("Results:");
        console.log("Revenue Stats:", revenueStats);
        console.log("Recent Bookings Count:", recentBookings.length);
        console.log("Commission Stats:", commissionStats);
        console.log("Recent Payments Count:", recentPayments.length);
    } catch (e: any) {
        console.error("Error encountered:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
