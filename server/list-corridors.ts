import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listCorridors() {
    try {
        const corridors = await prisma.corridorPricing.findMany();
        console.log('--- Current Corridors ---');
        corridors.forEach(c => {
            console.log(`Name: ${c.name}`);
            console.log(`Origins: ${c.originStations}`);
            console.log(`Destinations: ${c.destinationStations}`);
            console.log(`SL: ${c.markupSL}, 3A: ${c.markup3A}, 2A: ${c.markup2A}`);
            console.log('-------------------------');
        });
    } catch (e) {
        console.error('Failed to list corridors:', e);
    } finally {
        await prisma.$disconnect();
    }
}

listCorridors();
