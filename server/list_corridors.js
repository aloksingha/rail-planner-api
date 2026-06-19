const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCorridors() {
    try {
        const corridors = await prisma.corridorPricing.findMany();
        console.log("Current Corridors:");
        corridors.forEach(c => {
            console.log(`- ${c.name} (${c.id})`);
            console.log(`  Origins: ${c.originStations}`);
            console.log(`  Dests:   ${c.destinationStations}`);
            console.log(`  SL: ${c.markupSL}, 3A: ${c.markup3A}, 2A: ${c.markup2A}`);
            console.log("---");
        });
    } catch (e) {
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
}

listCorridors();
