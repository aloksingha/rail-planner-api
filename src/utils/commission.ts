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
