import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Create a new price request
router.post('/', requireAuth, async (req, res) => {
    const { trainName, trainNumber, source, destination, trainClass } = req.body;

    if (!trainName || !trainNumber || !source || !destination || !trainClass) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const request = await prisma.priceRequest.create({
            data: {
                userId: req.user!.userId,
                trainName,
                trainNumber,
                source,
                destination,
                class: trainClass,
                status: 'PENDING'
            }
        });
        return res.status(201).json(request);
    } catch (error: any) {
        console.error('Failed to create price request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// List price requests
router.get('/', requireAuth, async (req, res) => {
    try {
        let requests;
        if (['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role)) {
            // Admins see all pending and updated requests
            requests = await prisma.priceRequest.findMany({
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { email: true } } }
            });
        } else {
            // Customers see only their own requests
            const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
            const rawRequests = await prisma.priceRequest.findMany({
                where: { userId: req.user!.userId },
                orderBy: { createdAt: 'desc' }
            });

            // Filter out lapsed UPDATED requests
            requests = rawRequests.filter(r => {
                if (r.status === 'UPDATED' && r.updatedAt < threeHoursAgo) {
                    return false; // Lapsed
                }
                return true;
            });
        }
        return res.json(requests);
    } catch (error: any) {
        console.error('Failed to list price requests:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a price request (Admin only)
router.patch('/:id', requireAuth, async (req, res) => {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params as { id: string };
    const { suggestedPrice, adminComment, status } = req.body;

    try {
        const parseFloatSafe = (val: any) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? undefined : parsed;
        };

        const request = await prisma.priceRequest.update({
            where: { id },
            data: {
                suggestedPrice: suggestedPrice ? parseFloatSafe(suggestedPrice) : undefined,
                adminComment,
                status: status || 'UPDATED'
            }
        });
        return res.json(request);
    } catch (error: any) {
        console.error('Failed to update price request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get unread notification counts
router.get('/notifications', requireAuth, async (req, res) => {
    try {
        let count = 0;
        if (['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role)) {
            // Admins see count of PENDING requests
            count = await prisma.priceRequest.count({
                where: { status: 'PENDING' }
            });
        } else {
            // Customers see count of UPDATED requests that הם haven't seen yet? 
            // For now, just count UPDATED status for this user.
            count = await prisma.priceRequest.count({
                where: {
                    userId: req.user!.userId,
                    status: 'UPDATED'
                }
            });
        }
        return res.json({ count });
    } catch (error: any) {
        console.error('Failed to get notifications:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
