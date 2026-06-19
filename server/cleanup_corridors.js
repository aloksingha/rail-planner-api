const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
    console.log("Fetching all corridors...");
    const corridors = await prisma.corridorPricing.findMany();
    
    let deletedCount = 0;
    const keepIds = new Set();
    const deleteIds = new Set();

    for (let current of corridors) {
        if (deleteIds.has(current.id)) continue;

        // Try to find if a mirror exists
        // A mirror is another corridor where its origins match our destinations and vice versa.
        // Or simply checking if there's a corridor whose name is the swapped version.
        const parts = current.name.split('-');
        if (parts.length >= 2) {
            const reverseName = `${parts.slice(1).join('-').trim()} - ${parts[0].trim()}`;
            const reverseNameNoSpace = `${parts.slice(1).join('-').trim()}-${parts[0].trim()}`;
            
            const mirror = corridors.find(c => 
                c.id !== current.id && 
                !deleteIds.has(c.id) &&
                (c.name.toLowerCase() === reverseName.toLowerCase() || 
                 c.name.toLowerCase() === reverseNameNoSpace.toLowerCase() ||
                 (c.originStations === current.destinationStations && c.destinationStations === current.originStations))
            );

            if (mirror) {
                console.log(`Found duplicate mirror: [KEEP] ${current.name}  <-->  [DELETE] ${mirror.name}`);
                deleteIds.add(mirror.id);
                keepIds.add(current.id);
            }
        }
    }

    if (deleteIds.size > 0) {
        console.log(`\nFound ${deleteIds.size} duplicate mirror corridors. Deleting them now...`);
        for (let id of deleteIds) {
            await prisma.corridorPricing.delete({ where: { id } });
            deletedCount++;
        }
        console.log(`Successfully deleted ${deletedCount} redundant duplicate corridors!`);
    } else {
        console.log("No duplicate mirror corridors found!");
    }
}

cleanDuplicates().catch(console.error).finally(() => prisma.$disconnect());
