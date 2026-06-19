const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanFuzzyNames() {
    const corridors = await prisma.corridorPricing.findMany();
    
    // Group by normalized name (e.g. "Kolkata - Bangalore" -> "KOLKATABANGALORE")
    const groups = {};
    for (const c of corridors) {
        // Remove all spaces, dashes, non-alphanumeric, uppercase it
        const norm = c.name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        
        // Let's also handle the mirror name normalized (e.g. BANGALOREKOLKATA)
        let foundKey = norm;
        for (const existingKey of Object.keys(groups)) {
            // If the existing key is the mirror of this norm, group together
            // To check if mirror: we'd have to know the halves.
            // Since we stripped dashes, it's hard. But we can check if they share the exact same normalized name.
            if (existingKey === norm) {
                foundKey = existingKey;
                break;
            }
        }

        if (!groups[foundKey]) groups[foundKey] = [];
        groups[foundKey].push(c);
    }

    let deletedCount = 0;
    
    for (const [norm, group] of Object.entries(groups)) {
        if (group.length > 1) {
            console.log(`\nFound ${group.length} corridors for normalized name: ${norm}`);
            // Sort by updatedAt descending (newest first)
            group.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            const keep = group[0];
            console.log(`  [KEEP] ${keep.name} (SL: ${keep.markupSL}) - Updated: ${keep.updatedAt}`);
            
            for (let i = 1; i < group.length; i++) {
                const del = group[i];
                console.log(`  [DELETE] ${del.name} (SL: ${del.markupSL}) - Updated: ${del.updatedAt}`);
                await prisma.corridorPricing.delete({ where: { id: del.id } });
                deletedCount++;
            }
        }
    }

    if (deletedCount > 0) {
        console.log(`\nSuccessfully deleted ${deletedCount} older fuzzy duplicate corridors!`);
    } else {
        console.log(`\nNo older fuzzy duplicates found! The database is clean.`);
    }
}

cleanFuzzyNames().catch(console.error).finally(() => prisma.$disconnect());
