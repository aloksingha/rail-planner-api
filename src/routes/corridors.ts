import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Get all corridor pricing rules (Legacy alias for public access)
router.get('/public', async (req, res) => {
    try {
        const corridors = await prisma.corridorPricing.findMany({
            orderBy: { name: 'asc' }
        });
        return res.json({ success: true, corridors });
    } catch (error: any) {
        console.error('Fetch corridors public error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Get all corridor pricing rules
router.get('/', async (req, res) => {
    try {
        const corridors = await prisma.corridorPricing.findMany({
            orderBy: { name: 'asc' }
        });
        return res.json({ success: true, corridors });
    } catch (error: any) {
        console.error('Fetch corridors error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Create a new corridor pricing rule (Super Admin / Admin Only)
router.post('/', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { name, originStations, destinationStations, markupSL, markup3A, markup2A } = req.body;

    if (!name || !originStations || !destinationStations) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const corridor = await prisma.corridorPricing.create({
            data: {
                name,
                originStations: String(originStations),
                destinationStations: String(destinationStations),
                markupSL: markupSL ? parseFloat(markupSL) : 0,
                markup3A: markup3A ? parseFloat(markup3A) : 0,
                markup2A: markup2A ? parseFloat(markup2A) : 0
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE_CORRIDOR',
                performedByUserId: req.user!.userId,
                details: `Created Corridor Pricing rule: ${name}`
            }
        });

        return res.json({ success: true, corridor });
    } catch (error: any) {
        console.error('Create corridor error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A corridor with this name already exists.' });
        }
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Update a corridor pricing rule (auto-syncs vice-versa)
router.put('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { name, originStations, destinationStations, markupSL, markup3A, markup2A } = req.body;

    try {
        const corridor = await prisma.corridorPricing.update({
            where: { id: id as string },
            data: {
                name,
                originStations: originStations !== undefined ? String(originStations) : undefined,
                destinationStations: destinationStations !== undefined ? String(destinationStations) : undefined,
                markupSL: markupSL !== undefined ? parseFloat(markupSL) : undefined,
                markup3A: markup3A !== undefined ? parseFloat(markup3A) : undefined,
                markup2A: markup2A !== undefined ? parseFloat(markup2A) : undefined
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_CORRIDOR',
                performedByUserId: req.user!.userId,
                details: `Updated Corridor Pricing rule: ${corridor.name}`
            }
        });

        // ─── Auto-Sync Vice Versa ────────────────────────────────────────────────
        // If price fields were updated, find the mirror corridor (swapped origin/dest)
        // and apply the same prices automatically.
        let mirrorUpdated = false;
        if (markupSL !== undefined || markup3A !== undefined || markup2A !== undefined) {
            try {
                // Build reverse corridor name (e.g. "DELHI-MUMBAI" → "MUMBAI-DELHI")
                const parts = corridor.name.split('-');
                const reverseName = parts.length >= 2 ? `${parts.slice(1).join('-')}-${parts[0]}` : null;

                // First try by reversed name, then by swapped station arrays
                let mirrorCorridor = null;

                if (reverseName) {
                    mirrorCorridor = await prisma.corridorPricing.findFirst({
                        where: { name: reverseName, NOT: { id: corridor.id } }
                    });
                }

                // Fallback: match by swapped origin/destination station arrays
                if (!mirrorCorridor) {
                    mirrorCorridor = await prisma.corridorPricing.findFirst({
                        where: {
                            originStations: corridor.destinationStations,
                            destinationStations: corridor.originStations,
                            NOT: { id: corridor.id }
                        }
                    });
                }

                if (mirrorCorridor) {
                    await prisma.corridorPricing.update({
                        where: { id: mirrorCorridor.id },
                        data: {
                            markupSL: markupSL !== undefined ? parseFloat(markupSL) : undefined,
                            markup3A: markup3A !== undefined ? parseFloat(markup3A) : undefined,
                            markup2A: markup2A !== undefined ? parseFloat(markup2A) : undefined
                        }
                    });
                    mirrorUpdated = true;
                    console.log(`[Corridor] Auto-synced reverse: ${mirrorCorridor.name}`);
                }
            } catch (mirrorErr) {
                // Non-fatal: log but don't fail the main update
                console.warn('[Corridor] Mirror sync warning:', mirrorErr);
            }
        }
        // ─────────────────────────────────────────────────────────────────────────

        return res.json({ success: true, corridor, mirrorUpdated });
    } catch (error: any) {
        console.error('Update corridor error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});


// Delete a corridor pricing rule
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params;

    try {
        const corridor = await prisma.corridorPricing.delete({
            where: { id: id as string }
        });

        await prisma.auditLog.create({
            data: {
                action: 'DELETE_CORRIDOR',
                performedByUserId: req.user!.userId,
                details: `Deleted Corridor Pricing rule: ${corridor.name}`
            }
        });

        return res.json({ success: true, message: 'Corridor deleted successfully' });
    } catch (error: any) {
        console.error('Delete corridor error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
