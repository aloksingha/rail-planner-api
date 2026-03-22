import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Get settings (Public)
router.get('/', async (req, res) => {
    try {
        let settings = await prisma.globalSettings.findUnique({
            where: { id: 'singleton' }
        });

        // Initialize with defaults if not exists
        if (!settings) {
            settings = await prisma.globalSettings.create({
                data: { id: 'singleton' }
            });
        }

        return res.json({ success: true, settings });
    } catch (error: any) {
        console.error('Fetch settings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update settings (Super Admin Only)
router.patch('/', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { email, phone, address } = req.body;

    try {
        const settings = await prisma.globalSettings.upsert({
            where: { id: 'singleton' },
            update: {
                email,
                phone,
                address
            },
            create: {
                id: 'singleton',
                email,
                phone,
                address
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_GLOBAL_SETTINGS',
                performedByUserId: req.user!.userId,
                details: `Updated global contact settings: ${JSON.stringify({ email, phone, address })}`
            }
        });

        return res.json({ success: true, settings });
    } catch (error: any) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
