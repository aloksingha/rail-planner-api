const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const events = [
        { id: '1', name: 'Express Route A', description: 'Train EXP-101', date: new Date() },
        { id: '2', name: 'Coastal Line B', description: 'Train CST-202', date: new Date() },
        { id: '3', name: 'Mountain Link C', description: 'Train MTN-303', date: new Date() },
        { id: '4', name: 'Valley Regional', description: 'Train VAL-404', date: new Date() },
    ];

    for (const ev of events) {
        await prisma.event.upsert({
            where: { id: ev.id },
            update: { name: ev.name, description: ev.description, date: ev.date },
            create: ev
        });
    }

    console.log('Successfully seeded events');
}

main().catch(console.error).finally(() => prisma.$disconnect());
