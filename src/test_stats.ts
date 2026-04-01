import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStats() {
    console.log('Testing Statistics logic...');
    try {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        
        const [superAdmins, admins, salesMgrs, customers, todayBookings, totalBookings] = await Promise.all([
            prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
            prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma.user.count({ where: { role: 'SALES_MANAGER' } }),
            prisma.user.count({ where: { role: 'CUSTOMER' } }),
            prisma.booking.count({ where: { createdAt: { gte: todayStart } } }),
            prisma.booking.count()
        ]);

        console.log('--- Results ---');
        console.log('Total Users:', superAdmins + admins + salesMgrs + customers);
        console.log('Today Bookings:', todayBookings);
        console.log('Total Bookings:', totalBookings);
        console.log('Calculated userCount:', superAdmins + admins + salesMgrs + customers);
        
    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testStats();
