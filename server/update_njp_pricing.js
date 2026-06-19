const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateNJP() {
    try {
        console.log('Searching for NJP Corridor in CorridorPricing...');
        const corridor = await prisma.corridorPricing.findFirst({
            where: {
                destinationStations: { contains: 'NJP' }
            }
        });

        if (corridor) {
            console.log('Found Corridor:', corridor.name);
            await prisma.corridorPricing.update({
                where: { id: corridor.id },
                data: {
                    markupSL: 3000,
                    markup3A: 4500,
                    markup2A: 5500
                }
            });
            console.log('✅ Updated Successfully!');
        } else {
            console.log('NJP Corridor not found. Creating new one...');
            await prisma.corridorPricing.create({
                data: {
                    name: "Secunderabad - NJP",
                    originStations: JSON.stringify(["SC", "HYB", "KCG", "CHZ"]),
                    destinationStations: JSON.stringify(["NJP", "SGUJ", "SGUT", "SGU"]),
                    markupSL: 3000,
                    markup3A: 4500,
                    markup2A: 5500
                }
            });
            console.log('✅ Created Successfully!');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateNJP();
