const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customer) throw new Error('No customers found. Run seed_dummy.js first.');

    const event = await prisma.event.create({
        data: {
            name: 'Tech Conference 2026',
            description: 'Annual tech summit',
            date: new Date('2026-10-10')
        }
    });

    for (let i = 1; i <= 10; i++) {
        const payment = await prisma.paymentRecord.create({
            data: {
                orderId: `order_${i}`,
                paymentId: `pay_${i}`,
                amount: Math.floor(Math.random() * 500) + 50,
                status: 'CAPTURED',
                userId: customer.id
            }
        });

        await prisma.booking.create({
            data: {
                userId: customer.id,
                eventId: event.id,
                paymentId: payment.id,
                status: 'CONFIRMED'
            }
        });
    }

    console.log('Successfully seeded 10 dummy bookings and payments.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
