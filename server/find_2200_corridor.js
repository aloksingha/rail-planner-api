const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const corridors = await prisma.corridorPricing.findMany({
        where: { markupSL: 2200 }
    });
    console.log(JSON.stringify(corridors, null, 2));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
