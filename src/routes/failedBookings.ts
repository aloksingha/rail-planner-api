import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Publicly accessible to record a failure (no auth required to capture leads)
router.post('/', async (req, res) => {
    const { name, email, mobile, trainName, trainNumber, source, destination, journeyDate, trainClass, reason } = req.body;

    if (!name || !email || !mobile) {
        return res.status(400).json({ error: 'Name, Email, and Mobile are required' });
    }

    try {
        const failedBooking = await prisma.failedBooking.create({
            data: {
                name,
                email,
                mobile,
                trainName,
                trainNumber,
                source,
                destination,
                journeyDate,
                class: trainClass,
                reason
            }
        });
        return res.json({ success: true, id: failedBooking.id });
    } catch (error: any) {
        console.error('Record failed booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Only: Get all failed bookings
router.get('/', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const failedBookings = await prisma.failedBooking.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, failedBookings });
    } catch (error: any) {
        console.error('Fetch failed bookings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Only: Update status
router.patch('/:id/status', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'FOLLOWED_UP', 'IGNORED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await prisma.failedBooking.update({
            where: { id },
            data: { status }
        });
        return res.json({ success: true });
    } catch (error: any) {
        console.error('Update failed booking status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Only: Delete
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.failedBooking.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error: any) {
        console.error('Delete failed booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
