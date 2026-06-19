"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const refundQueue_1 = require("../queue/refundQueue");
const razorpayService_1 = require("../services/razorpayService");
const router = (0, express_1.Router)();
router.post('/initiate', auth_1.requireAuth, async (req, res) => {
    const { paymentId, amount, reason, region } = req.body;
    if (!paymentId || !amount)
        return res.status(400).json({ error: 'Missing payment details' });
    const paymentRecord = await prisma_1.prisma.paymentRecord.findUnique({
        where: { paymentId }
    });
    if (!paymentRecord)
        return res.status(404).json({ error: 'Payment record not found' });
    // Access check
    if (paymentRecord.userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Permission denied to refund this payment' });
    }
    try {
        const refund = await prisma_1.prisma.refundRecord.create({
            data: {
                paymentId,
                amount,
                region: region || 'Global',
                reason: reason || 'User requested cancellation',
                userId: paymentRecord.userId,
                status: 'AUTOMATED_PENDING',
            }
        });
        // Enqueue background job (for queue tracking if active)
        await refundQueue_1.refundQueue.add('process-refund', {
            refundId: refund.id,
            paymentId,
            amount
        });
        // Trigger background processing asynchronously
        (0, razorpayService_1.processTicketRefund)(refund.id).catch((err) => {
            console.error(`[Background Refund] Auto-refund failed for request ${refund.id}:`, err);
        });
        return res.json({ success: true, refundId: refund.id });
    }
    catch (error) {
        console.error('Failed to initiate refund', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});
exports.default = router;
