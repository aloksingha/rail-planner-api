import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { createAuditLog } from '../../services/auditService';

const router = Router();

// Get manual refunds
router.get('/refunds', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const refunds = await prisma.refundRecord.findMany({
            where: { status: 'MANUAL_PENDING' },
            orderBy: { manualCreditDueDate: 'asc' }
        });
        return res.json({ refunds });
    } catch (error) {
        console.error('Fetch manual refunds error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Mark manual refund as resolved
router.post('/refunds/:id/resolve', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    try {
        const refund = await prisma.refundRecord.update({
            where: { id },
            data: { status: 'MANUAL_RESOLVED' }
        });

        await createAuditLog({
            action: 'RESOLVE_MANUAL_REFUND',
            performedByUserId: req.user!.userId,
            details: `Resolved manual refund for payment ${refund.paymentId}`,
            targetUserId: refund.userId
        });

        return res.json({ success: true, message: 'Refund marked as resolved.' });
    } catch (error) {
        console.error('Resolve manual refund error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
