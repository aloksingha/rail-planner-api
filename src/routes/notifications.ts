import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /api/notifications/pulse
 * Dynamic heartbeat that returns unread counts for role-specific events.
 */
router.get('/pulse', requireAuth, async (req, res) => {
    const { userId, role } = req.user!;
    const lastSeenPulse = req.query.lastSeen ? new Date(req.query.lastSeen as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        let priceRequestCount = 0;
        let ticketUpdateActive = false;
        let walletUpdateActive = false;

        // 1. Price Requests logic
        if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
            // Admins should always see the total count of PENDING requests
            priceRequestCount = await prisma.priceRequest.count({
                where: { status: 'PENDING' }
            });
        } else {
            // Customers see count of UPDATED requests since they last checked
            priceRequestCount = await prisma.priceRequest.count({
                where: { 
                    userId, 
                    status: 'UPDATED',
                    updatedAt: { gt: lastSeenPulse }
                }
            });
        }


        // 2. Ticket Status Changes (Confirmed/Cancelled/Manual-Refunding)
        const recentBookingUpdate = await prisma.booking.findFirst({
            where: {
                userId,
                updatedAt: { gt: lastSeenPulse }
            }
        });
        if (recentBookingUpdate) ticketUpdateActive = true;

        // 3. Wallet Changes (Admin credits / Withdrawals processed)
        // Also check refund records directly
        const recentWalletUpdate = await prisma.walletTransaction.findFirst({
            where: {
                userId,
                createdAt: { gt: lastSeenPulse }
            }
        });
        if (recentWalletUpdate) walletUpdateActive = true;

        return res.json({
            priceRequestCount,
            ticketUpdateActive,
            walletUpdateActive,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Pulse error:', error);
        return res.status(500).json({ error: 'Failed to pulse' });
    }
});

export default router;
