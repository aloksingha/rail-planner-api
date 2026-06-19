const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSpecific() {
    // Fix Bhopal - Ahmedabad to SL: 1500, 3A: 2500, 2A: 3500
    // It might be named BHOPAL-AHMEDABAD or AHMEDABAD-BHOPAL
    const ahme_bhopal = await prisma.corridorPricing.findFirst({
        where: {
            OR: [
                { name: { contains: 'AHMEDABAD' }, AND: { name: { contains: 'BHOPAL' } } },
                { name: { contains: 'AHAMEDABAD' }, AND: { name: { contains: 'BHOPAL' } } }
            ]
        }
    });

    if (ahme_bhopal) {
        await prisma.corridorPricing.update({
            where: { id: ahme_bhopal.id },
            data: {
                markupSL: 1500,
                markup3A: 2500,
                markup2A: 3500
            }
        });
        console.log(`Updated ${ahme_bhopal.name} to 1500/2500/3500`);
    }

    // Fix Bhopal - Delhi to SL: 1200, 3A: 2500, 2A: 3000
    const bhopal_delhi = await prisma.corridorPricing.findFirst({
        where: {
            OR: [
                { name: { contains: 'BHOPAL' }, AND: { name: { contains: 'DELHI' } } }
            ]
        }
    });

    if (bhopal_delhi) {
        await prisma.corridorPricing.update({
            where: { id: bhopal_delhi.id },
            data: {
                markupSL: 1200,
                markup3A: 2500,
                markup2A: 3000
            }
        });
        console.log(`Updated ${bhopal_delhi.name} to 1200/2500/3000`);
    }
}

fixSpecific().catch(console.error).finally(() => prisma.$disconnect());
