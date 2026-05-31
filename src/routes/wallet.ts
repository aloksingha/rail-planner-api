import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';
import { parseWithdrawalDetails, processPayout } from '../services/razorpayService';

const router = Router();

/**
 * GET /api/wallet/history
 * Fetch current user's wallet balance and recent transaction history.
 */
router.get('/history', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
    const { userId } = req.user!;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { walletBalance: true }
        });

        const transactions = await prisma.walletTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return res.json({
            balance: user?.walletBalance || 0,
            transactions
        });
    } catch (error: any) {
        console.error('Wallet history error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/wallet/admin/adjust
 * Super Admin only: Manually credit or debit a user's wallet.
 */
router.post('/admin/adjust', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { targetUserId, amount, type, description } = req.body;

    if (!targetUserId || !amount || !['CREDIT', 'DEBIT'].includes(type)) {
        return res.status(400).json({ error: 'Missing targetUserId, amount, or valid type (CREDIT/DEBIT)' });
    }

    try {
        const adjustmentAmount = type === 'CREDIT' ? parseFloat(amount) : -parseFloat(amount);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update User Balance
            const updatedUser = await tx.user.update({
                where: { id: targetUserId },
                data: {
                    walletBalance: {
                        increment: adjustmentAmount
                    }
                }
            });

            if (updatedUser.walletBalance < 0) {
                throw new Error('Insufficient wallet balance for this deduction.');
            }

            // 2. Create Transaction Log
            const transaction = await tx.walletTransaction.create({
                data: {
                    userId: targetUserId,
                    amount: Math.abs(parseFloat(amount)),
                    type,
                    description: description || `Manual adjustment by Super Admin (${req.user!.userId})`
                }
            });

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'WALLET_ADJUSTMENT',
                    targetUserId,
                    performedByUserId: req.user!.userId,
                    details: `${type} of ₹${Math.abs(amount)} applied to wallet. New balance: ₹${updatedUser.walletBalance}`
                }
            });

            return { balance: updatedUser.walletBalance, transaction };
        });

        return res.json({
            success: true,
            message: `Successfully ${type.toLowerCase()}ed ₹${Math.abs(amount)}`,
            balance: result.balance
        });
    } catch (error: any) {
        console.error('Wallet adjustment error:', error);
        // Ensure we send a proper JSON error even for transaction failures
        const errorMessage = error.message || 'Internal Server Error during transaction';
        return res.status(error.status || 500).json({ 
            error: errorMessage
        });
    }
});

/**
 * GET /api/wallet/admin/all-transactions
 * Super Admin only: Fetch all wallet transactions across the platform.
 */
router.get('/admin/all-transactions', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        console.log(`[WalletAdmin] Fetching transactions for user ${req.user!.userId} (${req.user!.role})`);
        
        const transactions = await prisma.walletTransaction.findMany({
            orderBy: { createdAt: 'desc' },
            include: { 
                user: { 
                    select: { name: true, email: true } 
                } 
            },
            take: 200
        });

        // Filter out any where user data might be missing (orphaned records - though DB prevents this)
        const validTransactions = transactions.filter(tx => !!tx.user);

        // Calculate platform liability
        const users = await prisma.user.findMany({
            select: { walletBalance: true }
        });
        const totalLiability = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);

        console.log(`[WalletAdmin] Success. Records: ${validTransactions.length}, Total Liability: ${totalLiability}`);

        return res.json({
            transactions: validTransactions,
            totalLiability,
            totalTransactions: transactions.length
        });
    } catch (error: any) {
        console.error('[WalletAdmin] Fatal Error:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error fetching transactions',
            details: error.message,
            transactions: [],
            totalLiability: 0,
            totalTransactions: 0
        });
    }
});

/**
 * POST /api/wallet/withdraw-request
 * Allows Admin and Sales roles to request a withdrawal from their wallet.
 * The amount is deducted immediately to lock the funds.
 */
router.post('/withdraw-request', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
    const { amount, details } = req.body;

    if (!amount || amount < 500) {
        return res.status(400).json({ error: 'Minimum withdrawal amount is ₹500' });
    }

    if (!details) {
        return res.status(400).json({ error: 'Payment details (e.g. UPI ID or bank details) are required' });
    }

    // 1. Validate details upfront to reject malformed input immediately
    let parsedDetails;
    try {
        parsedDetails = parseWithdrawalDetails(details);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Invalid payout details format' });
    }

    try {
        // Calculate tiered transaction charges
        let charge = 10;
        if (amount > 1000 && amount <= 25000) charge = 15;
        if (amount > 25000) charge = 20;

        const totalDeduction = amount + charge;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Check & Deduct Balance
            const user = await tx.user.findUnique({
                where: { id: req.user!.userId },
                select: { walletBalance: true }
            });

            if (!user || user.walletBalance < totalDeduction) {
                throw new Error(`Insufficient wallet balance. Total required (including ₹${charge} charge): ₹${totalDeduction}`);
            }

            await tx.user.update({
                where: { id: req.user!.userId },
                data: { walletBalance: { decrement: totalDeduction } }
            });

            // 2. Create Withdrawal Request (using parsed type for method)
            const request = await tx.withdrawalRequest.create({
                data: {
                    userId: req.user!.userId,
                    amount,
                    charge,
                    method: parsedDetails.type,
                    details,
                    status: 'PENDING'
                }
            });

            // 3. Create Transaction Log (Locked)
            await tx.walletTransaction.create({
                data: {
                    userId: req.user!.userId,
                    amount: totalDeduction,
                    type: 'DEBIT',
                    description: `Withdrawal Request (Amt: ₹${amount}, Charge: ₹${charge}) - Funds Locked`
                }
            });

            return request;
        });

        // Trigger background processing asynchronously
        processPayout(result.id).catch((err) => {
            console.error(`[Background Payout] Auto-processing failed for request ${result.id}:`, err);
        });

        return res.json({ 
            success: true, 
            message: 'Withdrawal request submitted and being processed automatically.',
            requestId: result.id
        });
    } catch (error: any) {
        console.error('Withdrawal request error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

/**
 * GET /api/wallet/my-withdrawals
 * User's own withdrawal history.
 */
router.get('/my-withdrawals', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            where: { userId: req.user!.userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(withdrawals);
    } catch (error) {
        console.error('Fetch withdrawals error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/wallet/admin/withdrawals
 * Super Admin only: Fetch all pending/recent withdrawal requests.
 */
router.get('/admin/withdrawals', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return res.json(withdrawals);
    } catch (error) {
        console.error('Admin fetch withdrawals error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * PATCH /api/wallet/admin/process-withdrawal/:id
 * Super Admin only: Approve (COMPLETED) or Reject (REJECTED) a withdrawal.
 */
router.patch('/admin/process-withdrawal/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    const { status, adminComment } = req.body;

    if (!['COMPLETED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Use COMPLETED or REJECTED.' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.withdrawalRequest.findUnique({
                where: { id },
                include: { user: true }
            });

            if (!request) throw new Error('Withdrawal request not found');
            if (request.status !== 'PENDING') throw new Error('Request already processed');

            // Update status
            const updatedRequest = await tx.withdrawalRequest.update({
                where: { id },
                data: { status, adminComment, updatedAt: new Date() }
            });

            // If REJECTED, refund the balance
            if (status === 'REJECTED') {
                const totalRefund = request.amount + request.charge;
                await tx.user.update({
                    where: { id: request.userId },
                    data: { walletBalance: { increment: totalRefund } }
                });

                await tx.walletTransaction.create({
                    data: {
                        userId: request.userId,
                        amount: totalRefund,
                        type: 'CREDIT',
                        description: `Withdrawal Rejected (ID: ${id.substring(0, 8)}) - Funds Restored (₹${request.amount} + ₹${request.charge} fee)`
                    }
                });
            }

            // Audit Log
            await tx.auditLog.create({
                data: {
                    action: `WITHDRAWAL_${status}`,
                    targetUserId: request.userId,
                    performedByUserId: req.user!.userId,
                    details: `${status} withdrawal of ₹${request.amount}. ${adminComment || ''}`
                }
            });

            return updatedRequest;
        });

        return res.json({ success: true, request: result });
    } catch (error: any) {
        console.error('Process withdrawal error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
