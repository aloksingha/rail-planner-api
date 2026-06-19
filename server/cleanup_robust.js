const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanRobust() {
    const corridors = await prisma.corridorPricing.findMany();
    
    // Parse all arrays
    const parsed = corridors.map(c => {
        try {
            return {
                ...c,
                origArr: JSON.parse(c.originStations).map(s => String(s).toUpperCase().trim()),
                destArr: JSON.parse(c.destinationStations).map(s => String(s).toUpperCase().trim())
            }
        } catch {
            return { ...c, origArr: [], destArr: [] }
        }
    });

    const toDelete = new Set();
    
    // Find structural duplicates
    for (let i = 0; i < parsed.length; i++) {
        let current = parsed[i];
        if (toDelete.has(current.id)) continue;
        
        for (let j = i + 1; j < parsed.length; j++) {
            let other = parsed[j];
            if (toDelete.has(other.id)) continue;
            
            // Check if 'other' is a mirror of 'current'
            // Origins of current == Dests of other
            // Dests of current == Origins of other
            
            // Just checking if at least one shared station exists in both directions to be safe,
            // or we can test if the arrays are identical
            const isMirrorOrigins = current.origArr.length === other.destArr.length && 
                                   current.origArr.every(x => other.destArr.includes(x));
                                   
            const isMirrorDests = current.destArr.length === other.origArr.length && 
                                 current.destArr.every(x => other.origArr.includes(x));
                                 
            // Also check for exact same direction duplicate
            const isSameOrigins = current.origArr.length === other.origArr.length && 
                                   current.origArr.every(x => other.origArr.includes(x));
            const isSameDests = current.destArr.length === other.destArr.length && 
                                 current.destArr.every(x => other.destArr.includes(x));
                                 
            if (isMirrorOrigins && isMirrorDests) {
                console.log(`Mirror Duplicate Found:`);
                console.log(`KEEP: ${current.name} (SL: ${current.markupSL})`);
                console.log(`DELETE: ${other.name} (SL: ${other.markupSL})`);
                
                // Keep the one with higher price? The user said "I have Fixed Price for this Route in Ahamedabad Bhopal Corridor But asking to update the Price in Bhopal Ahamedabad Corridor"
                // Meaning they probably put the REAL price in one of them and 0 or legacy price in the other.
                // Let's keep the one that was updated most recently!
                if (new Date(other.updatedAt) > new Date(current.updatedAt)) {
                    toDelete.add(current.id);
                    // swap reference so further checks align with 'other'
                    current = other; 
                } else {
                    toDelete.add(other.id);
                }
            } else if (isSameOrigins && isSameDests) {
                console.log(`Exact Duplicate Found: KEEP ${current.name}, DELETE ${other.name}`);
                if (new Date(other.updatedAt) > new Date(current.updatedAt)) {
                    toDelete.add(current.id);
                    current = other;
                } else {
                    toDelete.add(other.id);
                }
            }
        }
    }

    if (toDelete.size > 0) {
        console.log(`Deleting ${toDelete.size} redundant corridors...`);
        for (let id of toDelete) {
            await prisma.corridorPricing.delete({ where: { id } });
        }
        console.log("Cleanup complete!");
    } else {
        console.log("No further duplicates found.");
    }
}

cleanRobust().catch(console.error).finally(() => prisma.$disconnect());
