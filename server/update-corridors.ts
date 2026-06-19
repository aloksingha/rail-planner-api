import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCorridors() {
    try {
        const corridors = [
            {
                name: 'DELHI-MUMBAI',
                originStations: JSON.stringify(["NDLS", "DLI", "NZM", "ANVT", "DEC", "DEE"]),
                destinationStations: JSON.stringify(["MMCT", "CSMT", "BDTS", "PNVL", "DR", "LTT"]),
                markupSL: 1000,
                markup3A: 1800,
                markup2A: 2500
            },
            {
                name: 'DELHI-BANGALORE',
                originStations: JSON.stringify(["NDLS", "DLI", "NZM", "ANVT", "DEC", "DEE"]),
                destinationStations: JSON.stringify(["SBC", "YPR", "BNC", "KJM", "SMVB"]),
                markupSL: 1800,
                markup3A: 3000,
                markup2A: 3800
            },
            {
                name: 'MUMBAI-BANGALORE',
                originStations: JSON.stringify(["MMCT", "CSMT", "BDTS", "PNVL", "DR", "LTT"]),
                destinationStations: JSON.stringify(["SBC", "YPR", "BNC", "KJM", "SMVB"]),
                markupSL: 1200,
                markup3A: 2000,
                markup2A: 2600
            }
        ];

        for (const c of corridors) {
            await prisma.corridorPricing.upsert({
                where: { name: c.name },
                update: c,
                create: c
            });
            console.log(`✅ Upserted corridor: ${c.name}`);
        }
    } catch (e) {
        console.error('Failed to update corridors:', e);
    } finally {
        await prisma.$disconnect();
    }
}

updateCorridors();
