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
                data: {
                    id: 'singleton',
                    email: 'support@ticketspro.in',
                    phone: '1800-123-4567',
                    address: '123 Express Hub, Tech Park Phase 2, Bengaluru, Karnataka 560100',
                    whatsapp: '',
                    facebook: '',
                    telegram: ''
                }
            });
        }

        res.json({ success: true, settings });
    } catch (err) {
        console.error('Failed to get settings', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Update settings (Super Admin Only)
router.patch('/', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { email, phone, address, whatsapp, facebook, telegram } = req.body;

        const settings = await prisma.globalSettings.upsert({
            where: { id: 'singleton' },
            update: {
                email,
                phone,
                address,
                whatsapp,
                facebook,
                telegram
            },
            create: {
                id: 'singleton',
                email,
                phone,
                address,
                whatsapp: whatsapp || '',
                facebook: facebook || '',
                telegram: telegram || ''
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
