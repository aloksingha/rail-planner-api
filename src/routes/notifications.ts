import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// Intelligence Pulse: Sync unread counts for Admin/SuperAdmin and Status updates for Customers
router.get('/pulse', requireAuth, async (req, res) => {
    const { role, userId } = req.user!;
    
    try {
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
            const [priceRequestCount, failedBookingCount, withdrawalRequestCount] = await Promise.all([
                prisma.priceRequest.count({ where: { status: 'PENDING' } }),
                prisma.failedBooking.count({ where: { status: 'PENDING' } }),
                prisma.withdrawalRequest.count({ where: { status: 'PENDING' } })
            ]);

            return res.json({
                priceRequestCount,
                failedBookingCount,
                withdrawalRequestCount,
                timestamp: new Date().toISOString()
            });
        }

        // Customer Logic: Check for updated price requests or wallet updates
        if (role === 'CUSTOMER' || role === 'SALES_MANAGER') {
            const [updatedPriceRequests, walletUpdate] = await Promise.all([
                prisma.priceRequest.count({ 
                    where: { userId, status: 'UPDATED' } 
                }),
                prisma.walletTransaction.findFirst({
                    where: { userId, createdAt: { gte: new Date(Date.now() - 60000) } } // Last 1 minute
                })
            ]);

            return res.json({
                updatedPriceRequests,
                walletUpdateActive: !!walletUpdate,
                timestamp: new Date().toISOString()
            });
        }

        return res.json({ timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('[Pulse] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch pulse data' });
    }
});

export default router;
