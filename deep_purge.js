const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING FINAL DEEP PURGE ---');
    try {
        // Delete in order to satisfy FK constraints
        const refundCnt = await prisma.refundRecord.deleteMany();
        console.log(`- Deleted ${refundCnt.count} RefundRecords`);

        const bookingCnt = await prisma.booking.deleteMany();
        console.log(`- Deleted ${bookingCnt.count} Bookings`);

        const paymentCnt = await prisma.paymentRecord.deleteMany();
        console.log(`- Deleted ${paymentCnt.count} PaymentRecords`);

        const walletTxCnt = await prisma.walletTransaction.deleteMany();
        console.log(`- Deleted ${walletTxCnt.count} WalletTransactions`);

        const withdrawalCnt = await prisma.withdrawalRequest.deleteMany();
        console.log(`- Deleted ${withdrawalCnt.count} WithdrawalRequests`);

        const auditCnt = await prisma.auditLog.deleteMany();
        console.log(`- Deleted ${auditCnt.count} AuditLogs`);

        const failedCnt = await prisma.failedBooking.deleteMany();
        console.log(`- Deleted ${failedCnt.count} FailedBookings`);

        const priceCnt = await prisma.priceRequest.deleteMany();
        console.log(`- Deleted ${priceCnt.count} PriceRequests`);

        // Reset all user balances to 0
        const users = await prisma.user.updateMany({
            data: { walletBalance: 0 }
        });
        console.log(`- Reset wallet balances for ${users.count} Users`);

        console.log('✅ DATABASE IS TOTALLY EMPTY OF TRANSACTIONS');
    } catch (e) {
        console.error('❌ PURGE ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
