import { Prisma } from '@prisma/client';

/**
 * Calculates and applies commission to the associated Sales Manager for a confirmed booking.
 * 
 * Commission Structure:
 * - Ticket Price < ₹1500: 5% of ticket price
 * - Ticket Price >= ₹1500 and < ₹4000: 7% of ticket price
 * - Ticket Price >= ₹4000: 10% of ticket price
 */
export async function checkAndApplyCommission(
    tx: Omit<Prisma.TransactionClient, '$use'>,
    bookingUserId: string,
    amount: number,
    bookingId: string,
    trainNo?: string
) {
    try {
        // 1. Fetch booking user details to determine if a Sales Manager is associated
        const bookingUser = await tx.user.findUnique({
            where: { id: bookingUserId },
            select: { id: true, role: true, createdByUserId: true }
        });

        if (!bookingUser) return;

        let salesManagerId: string | null = null;

        // If the booking user is a Sales Manager themselves, they receive the commission
        if (bookingUser.role === 'SALES_MANAGER') {
            salesManagerId = bookingUser.id;
        } else if (bookingUser.createdByUserId) {
            // Otherwise, check if the user who created this customer is a Sales Manager
            const creator = await tx.user.findUnique({
                where: { id: bookingUser.createdByUserId },
                select: { id: true, role: true }
            });
            if (creator && creator.role === 'SALES_MANAGER') {
                salesManagerId = creator.id;
            }
        }

        if (!salesManagerId) return;

        // 2. Calculate Commission Based on Pricing
        let commissionPercentage = 0.05;
        if (amount >= 1500 && amount < 4000) {
            commissionPercentage = 0.07;
        } else if (amount >= 4000) {
            commissionPercentage = 0.10;
        }

        let commissionAmount = amount * commissionPercentage;
        commissionAmount = Math.round(commissionAmount * 100) / 100; // Round to 2 decimal places

        if (commissionAmount <= 0) return;

        // 3. Increment the Sales Manager's Wallet Balance
        await tx.user.update({
            where: { id: salesManagerId },
            data: { walletBalance: { increment: commissionAmount } }
        });

        // 4. Create Wallet Transaction entry for the Sales Manager
        await tx.walletTransaction.create({
            data: {
                userId: salesManagerId,
                amount: commissionAmount,
                type: 'CREDIT',
                bookingId, // Correctly link to the booking for state lookup
                description: `Sales Commission: Booking ${bookingId} (Train: ${trainNo || 'Unknown'})`
            }
        });

        // 5. Log the commission application in the Audit Logs
        await tx.auditLog.create({
            data: {
                action: 'SALES_COMMISSION',
                targetUserId: salesManagerId,
                performedByUserId: bookingUserId,
                details: `Credited ₹${commissionAmount} (${(commissionPercentage * 100)}%) commission to Sales Manager for booking ${bookingId} of amount ₹${amount}.`
            }
        });

        console.log(`[Commission] Successfully credited ₹${commissionAmount} commission to Sales Manager ${salesManagerId} for booking ${bookingId}`);
    } catch (error) {
        console.error('[Commission] Error applying commission:', error);
        // Rethrow inside transaction to ensure consistency
        throw error;
    }
}

/**
 * Handles deduction of commission when a booking is cancelled.
 */
export async function handleBookingCancellation(
    tx: Omit<Prisma.TransactionClient, '$use'>,
    bookingId: string
) {
    try {
        // 1. Find the credit wallet transaction containing commission for this bookingId
        const commissionTx = await tx.walletTransaction.findFirst({
            where: {
                bookingId,
                type: 'CREDIT',
                description: { contains: 'Commission' }
            }
        });

        if (!commissionTx) {
            console.log(`[Commission] No commission transaction found to deduct for cancelled booking ${bookingId}`);
            return;
        }

        const salesManagerId = commissionTx.userId;
        const commissionAmount = commissionTx.amount;

        // 2. Check if we have already deducted commission for this booking
        const existingDeduction = await tx.walletTransaction.findFirst({
            where: {
                bookingId,
                userId: salesManagerId,
                type: 'DEBIT',
                description: { contains: 'deduction' }
            }
        });

        if (existingDeduction) {
            console.log(`[Commission] Commission already deducted for cancelled booking ${bookingId}`);
            return;
        }

        // 3. Decrement Sales Manager's Wallet Balance
        await tx.user.update({
            where: { id: salesManagerId },
            data: { walletBalance: { decrement: commissionAmount } }
        });

        // 4. Create a debit Wallet Transaction log
        await tx.walletTransaction.create({
            data: {
                userId: salesManagerId,
                amount: commissionAmount,
                type: 'DEBIT',
                bookingId,
                description: `Commission deduction: Booking ${bookingId} cancelled`
            }
        });

        // 5. Create Audit Log
        await tx.auditLog.create({
            data: {
                action: 'SALES_COMMISSION_DEDUCTION',
                targetUserId: salesManagerId,
                performedByUserId: 'SYSTEM',
                details: `Deducted ₹${commissionAmount} commission from Sales Manager ${salesManagerId} because booking ${bookingId} was cancelled.`
            }
        });

        console.log(`[Commission] Successfully deducted ₹${commissionAmount} commission from Sales Manager ${salesManagerId} for cancelled booking ${bookingId}`);
    } catch (error) {
        console.error('[Commission] Error handling booking cancellation commission:', error);
        throw error;
    }
}
