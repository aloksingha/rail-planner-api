const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purge() {
    console.log('--- Offline Transaction Purge Started ---');
    
    // 1. Identify all offline payment records
    const offlinePayments = await prisma.paymentRecord.findMany({
        where: {
            OR: [
                { paymentId: { startsWith: 'OFF_' } },
                { orderId: { startsWith: 'ORD_OFF_' } }
            ]
        }
    });
    
    const paymentIds = offlinePayments.map(p => p.paymentId);
    console.log(`Found ${paymentIds.length} offline payment records.`);
    
    if (paymentIds.length === 0) {
        console.log('No records to delete.');
        return;
    }

    // 2. Find associated bookings
    const bookings = await prisma.booking.findMany({
        where: {
            paymentId: { in: paymentIds }
        }
    });
    
    const bookingIds = bookings.map(b => b.id);
    const eventIds = bookings.map(b => b.eventId);
    console.log(`Associated bookings: ${bookingIds.length}`);

    // 3. Delete in correct order (dependency management)
    
    // Delete Refunds
    const delRefunds = await prisma.refundRecord.deleteMany({
        where: { bookingId: { in: bookingIds } }
    });
    console.log(`Deleted ${delRefunds.count} refund records.`);

    // Delete Wallet Trans
    const delWallet = await prisma.walletTransaction.deleteMany({
        where: { bookingId: { in: bookingIds } }
    });
    console.log(`Deleted ${delWallet.count} wallet transactions.`);

    // Delete Audit Logs referencing these bookings (if needed, but usually we don't CASCADE audit logs)
    
    // Delete Bookings
    const delBookings = await prisma.booking.deleteMany({
        where: { id: { in: bookingIds } }
    });
    console.log(`Deleted ${delBookings.count} bookings.`);

    // Delete Events (Journey records)
    const delEvents = await prisma.event.deleteMany({
        where: { id: { in: eventIds } }
    });
    console.log(`Deleted ${delEvents.count} events.`);

    // Delete Payments
    const delPayments = await prisma.paymentRecord.deleteMany({
        where: { paymentId: { in: paymentIds } }
    });
    console.log(`Deleted ${delPayments.count} payment records.`);

    console.log('--- Purge Complete ---');
}

purge()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
