"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const auditService_1 = require("../../services/auditService");
const router = (0, express_1.Router)();
// Get manual refunds
router.get('/refunds', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const refunds = await prisma_1.prisma.refundRecord.findMany({
            where: { status: 'MANUAL_PENDING' },
            orderBy: { manualCreditDueDate: 'asc' }
        });
        return res.json({ refunds });
    }
    catch (error) {
        console.error('Fetch manual refunds error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Mark manual refund as resolved
router.post('/refunds/:id/resolve', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        const refund = await prisma_1.prisma.refundRecord.update({
            where: { id },
            data: { status: 'MANUAL_RESOLVED' }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'RESOLVE_MANUAL_REFUND',
            performedByUserId: req.user.userId,
            details: `Resolved manual refund for payment ${refund.paymentId}`,
            targetUserId: refund.userId
        });
        return res.json({ success: true, message: 'Refund marked as resolved.' });
    }
    catch (error) {
        console.error('Resolve manual refund error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
