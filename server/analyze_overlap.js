const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeOverlaps() {
    const corridors = await prisma.corridorPricing.findMany();
    
    // Parse arrays
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

    const intersects = (arr1, arr2) => arr1.some(item => arr2.includes(item));
    
    let overlapCount = 0;
    const reported = new Set();
    const toDelete = new Set();

    for (let i = 0; i < parsed.length; i++) {
        const current = parsed[i];
        if (toDelete.has(current.id)) continue;
        
        for (let j = i + 1; j < parsed.length; j++) {
            const other = parsed[j];
            if (toDelete.has(other.id)) continue;

            const isSameDir = intersects(current.origArr, other.origArr) && intersects(current.destArr, other.destArr);
            const isReverseDir = intersects(current.origArr, other.destArr) && intersects(current.destArr, other.origArr);

            if (isSameDir || isReverseDir) {
                const pairId = [current.id, other.id].sort().join('-');
                if (reported.has(pairId)) continue;
                reported.add(pairId);
                overlapCount++;

                console.log(`\n overlap found:`);
                console.log(`  [1] ${current.name} (SL: ${current.markupSL}) [origins: ${current.origArr.length}] [dests: ${current.destArr.length}] - Updated: ${current.updatedAt}`);
                console.log(`  [2] ${other.name} (SL: ${other.markupSL}) [origins: ${other.origArr.length}] [dests: ${other.destArr.length}] - Updated: ${other.updatedAt}`);
                
                // Which one to delete? 
                // Mostly the ALL-CAPS ones (like THIRUVANANTHAPURAM-KOLKATA) are the old legacy ones, and the standard camel case (Kolkata - Kerala) are the new seeded ones.
                // We'll delete the older one based on updatedAt, OR if one is purely uppercase and the other is not, maybe delete uppercase?
                // Let's rely on updatedAt for now.
                if (new Date(other.updatedAt) > new Date(current.updatedAt)) {
                    console.log(`  -> Action: Delete [1] ${current.name}`);
                    toDelete.add(current.id);
                } else {
                    console.log(`  -> Action: Delete [2] ${other.name}`);
                    toDelete.add(other.id);
                }
            }
        }
    }

    console.log(`\nFound ${overlapCount} overlapping pairs.`);
    if (toDelete.size > 0) {
        console.log(`Deleting ${toDelete.size} redundant older overlapping corridors...`);
        let deleted = 0;
        for (let id of toDelete) {
            await prisma.corridorPricing.delete({ where: { id } });
            deleted++;
        }
        console.log(`Successfully deleted ${deleted} overlapping corridors!`);
    } else {
        console.log('No overlaps to delete.');
    }
}

analyzeOverlaps().catch(console.error).finally(() => prisma.$disconnect());
