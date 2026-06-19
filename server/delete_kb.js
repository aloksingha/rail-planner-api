const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteKolkataBangalore() {
    const res = await prisma.corridorPricing.deleteMany({
        where: {
            name: 'KOLKATA-BANGALORE',
            markupSL: 2200
        }
    });
    console.log("Deleted old KOLKATA-BANGALORE corridor:", res);
}

deleteKolkataBangalore().catch(console.error).finally(() => prisma.$disconnect());
