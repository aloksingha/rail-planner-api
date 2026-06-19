const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const corridors = await prisma.corridorPricing.findMany();
    const matches = corridors.filter(c => {
        const o = c.originStations.toLowerCase();
        const d = c.destinationStations.toLowerCase();
        return o.includes('hwh') || o.includes('smvb') || o.includes('sbc') || 
               d.includes('hwh') || d.includes('smvb') || d.includes('sbc');
    });
    console.log(JSON.stringify(matches, null, 2));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
