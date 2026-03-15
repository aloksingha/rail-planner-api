import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

// Public: Submit a contact message
router.post('/', async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const msg = await prisma.contactMessage.create({
            data: { name, email, subject, message }
        });
        return res.json({ success: true, id: msg.id });
    } catch (err: any) {
        console.error('Contact submit error:', err);
        return res.status(500).json({ error: 'Failed to save message.' });
    }
});

// Super Admin: Get all contact messages
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
    try {
        const messages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, messages });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Super Admin: Mark message as READ or RESOLVED
router.patch('/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const status = req.body.status as string;
    const valid = ['UNREAD', 'READ', 'RESOLVED'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const msg = await prisma.contactMessage.update({ where: { id }, data: { status } });
        return res.json({ success: true, message: msg });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Super Admin: Delete a message
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.contactMessage.delete({ where: { id } });
        return res.json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
