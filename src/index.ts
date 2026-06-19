import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { seedCorridors } from './seed';
import { prisma } from './prisma';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Auto-seed corridor pricing rules (non-blocking)
    seedCorridors();

    // Migrate legacy special permissions
    try {
        await prisma.$executeRawUnsafe(`
            UPDATE "User"
            SET "specialPermissions" = ARRAY['BROADCAST_MESSAGES', 'CORRIDOR_PRICING', 'PRICE_REQUESTS', 'FAILED_BOOKINGS', 'GLOBAL_BOOKINGS', 'WALLET_MANAGEMENT', 'MANAGE_COUPONS']
            WHERE "hasSpecialPermission" = true AND "specialPermissions" = '{}'::text[];
        `);
        console.log('[Startup] Successfully migrated legacy special permissions.');
    } catch (e) {
        console.error('[Startup] Failed to migrate legacy special permissions:', e);
    }

    // Specific update for Kolkata-Chennai pricing rules
    try {
        const targetNames = ['KOLKATA-CHENNAI', 'CHENNAI-KOLKATA'];
        for (const name of targetNames) {
            const corridor = await prisma.corridorPricing.findFirst({ where: { name } });
            if (corridor) {
                await prisma.corridorPricing.update({
                    where: { id: corridor.id },
                    data: { markupSL: 2513, markup3A: 3900, markup2A: 5188 }
                });
                console.log(`[Startup] Successfully updated pricing for ${name}`);
            }
        }
    } catch (e) {
        console.error('[Startup] Failed to update Kolkata-Chennai pricing:', e);
    }
});