import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma';
import { refundQueue } from '../queue/refundQueue';

const router = Router();

router.post('/initiate', requireAuth, async (req, res) => {
    const { paymentId, amount, reason, region } = req.body;
    if (!paymentId || !amount) return res.status(400).json({ error: 'Missing payment details' });

    const paymentRecord = await prisma.paymentRecord.findUnique({
        where: { paymentId }
    });

    if (!paymentRecord) return res.status(404).json({ error: 'Payment record not found' });

    // Access check
    if (paymentRecord.userId !== req.user!.userId && req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Permission denied to refund this payment' });
    }

    try {
        const refund = await prisma.refundRecord.create({
            data: {
                paymentId,
                amount,
                region: region || 'Global',
                reason: reason || 'User requested cancellation',
                userId: paymentRecord.userId,
                status: 'AUTOMATED_PENDING',
            }
        });

        // Enqueue background job
        await refundQueue.add('process-refund', {
            refundId: refund.id,
            paymentId,
            amount
        });

        return res.json({ success: true, refundId: refund.id });
    } catch (error) {
        console.error('Failed to initiate refund', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
