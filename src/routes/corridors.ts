import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Get all corridor pricing rules
router.get('/', async (req, res) => {
    try {
        const corridors = await (prisma as any).corridorPricing.findMany({
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
        const corridor = await (prisma as any).corridorPricing.create({
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

// Update a corridor pricing rule
router.put('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { name, originStations, destinationStations, markupSL, markup3A, markup2A } = req.body;

    try {
        const corridor = await (prisma as any).corridorPricing.update({
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

        return res.json({ success: true, corridor });
    } catch (error: any) {
        console.error('Update corridor error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Delete a corridor pricing rule
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params;

    try {
        const corridor = await (prisma as any).corridorPricing.delete({
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
