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
        // Deduplication: Check if a similar failure was recorded in the last 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const existing = await prisma.failedBooking.findFirst({
            where: {
                mobile,
                trainNumber,
                journeyDate,
                createdAt: { gte: fifteenMinutesAgo }
            }
        });

        if (existing) {
            console.log(`[FailedBooking] Updating existing record ${existing.id} instead of creating duplicate.`);
            const updated = await prisma.failedBooking.update({
                where: { id: existing.id },
                data: { 
                    reason: reason || existing.reason, // Use new reason if provided
                    updatedAt: new Date()
                }
            });
            return res.json({ success: true, id: updated.id, updated: true });
        }

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
            where: { id: id as string },
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
        await prisma.failedBooking.delete({ where: { id: id as string } });
        return res.json({ success: true });
    } catch (error: any) {
        console.error('Delete failed booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
