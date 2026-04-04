import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /api/wallet/history
 * Fetch current user's wallet balance and recent transaction history.
 */
router.get('/history', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
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

export default router;
