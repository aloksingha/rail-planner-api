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
    if (!paymentId || amount === undefined)
        return res.status(400).json({ error: 'Missing payment details' });
    const numAmount = Number(amount);
    if (!isFinite(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid refund amount. Must be a positive number greater than 0.' });
    }
    const paymentRecord = await prisma_1.prisma.paymentRecord.findUnique({
        where: { paymentId }
    });
    if (!paymentRecord)
        return res.status(404).json({ error: 'Payment record not found' });
    // Access check
    if (paymentRecord.userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Permission denied to refund this payment' });
    }
    // Verify refund amount does not exceed original payment
    if (numAmount > paymentRecord.amount) {
        return res.status(400).json({
            error: `Refund amount (₹${numAmount}) cannot exceed original payment amount (₹${paymentRecord.amount}).`
        });
    }
    // Verify cumulative refunds do not exceed original payment
    const existingRefunds = await prisma_1.prisma.refundRecord.findMany({
        where: {
            paymentId,
            status: { in: ['COMPLETED', 'AUTOMATED_PENDING', 'MANUAL_PENDING', 'MANUAL_RESOLVED'] }
        }
    });
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    if (totalRefunded + numAmount > paymentRecord.amount) {
        return res.status(400).json({
            error: `Cumulative refunds (₹${totalRefunded + numAmount}) would exceed original payment amount (₹${paymentRecord.amount}). Already refunded/pending: ₹${totalRefunded}.`
        });
    }
    // Linked booking check: must be CANCELLED unless Super Admin
    const linkedBooking = await prisma_1.prisma.booking.findFirst({ where: { paymentId } });
    if (linkedBooking && linkedBooking.status !== 'CANCELLED' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(400).json({ error: 'Cannot initiate refund: associated booking must be cancelled first.' });
    }
    try {
        const refund = await prisma_1.prisma.refundRecord.create({
            data: {
                paymentId,
                amount: numAmount,
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
            amount: numAmount
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
