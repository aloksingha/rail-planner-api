"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
// Intelligence Pulse: Sync unread counts for Admin/SuperAdmin and Status updates for Customers
router.get('/pulse', auth_1.requireAuth, async (req, res) => {
    const { role, userId } = req.user;
    try {
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
            const isSuperAdmin = role === 'SUPER_ADMIN';
            const [priceRequestCount, failedBookingCount, withdrawalRequestCount] = await Promise.all([
                prisma_1.prisma.priceRequest.count({ where: { status: 'PENDING' } }),
                isSuperAdmin ? prisma_1.prisma.failedBooking.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
                isSuperAdmin ? prisma_1.prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }) : Promise.resolve(0)
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
                prisma_1.prisma.priceRequest.count({
                    where: { userId, status: 'UPDATED' }
                }),
                prisma_1.prisma.walletTransaction.findFirst({
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
    }
    catch (error) {
        console.error('[Pulse] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch pulse data' });
    }
});
exports.default = router;
