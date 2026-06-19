"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndApplyCommission = checkAndApplyCommission;
exports.handleBookingCancellation = handleBookingCancellation;
exports.handlePartialBookingCancellation = handlePartialBookingCancellation;
/**
 * Calculates and applies commission to the associated Sales Manager for a confirmed booking.
 *
 * Commission Structure:
 * - Ticket Price < ₹1500: 6% of ticket price
 * - Ticket Price >= ₹1500 and < ₹3500: 8% of ticket price
 * - Ticket Price >= ₹3500 and < ₹6000: 10% of ticket price
 * - Ticket Price >= ₹6000: 12% of ticket price
 */
async function checkAndApplyCommission(tx, bookingUserId, amount, bookingId, trainNo) {
    try {
        // 1. Fetch booking user details to determine if a Sales Manager is associated
        const bookingUser = await tx.user.findUnique({
            where: { id: bookingUserId },
            select: { id: true, role: true, createdByUserId: true }
        });
        if (!bookingUser)
            return;
        let salesManagerId = null;
        // If the booking user is a Sales Manager themselves, they receive the commission
        if (bookingUser.role === 'SALES_MANAGER') {
            salesManagerId = bookingUser.id;
        }
        else if (bookingUser.createdByUserId) {
            // Otherwise, check if the user who created this customer is a Sales Manager
            const creator = await tx.user.findUnique({
                where: { id: bookingUser.createdByUserId },
                select: { id: true, role: true }
            });
            if (creator && creator.role === 'SALES_MANAGER') {
                salesManagerId = creator.id;
            }
        }
        if (!salesManagerId)
            return;
        // 2. Calculate Commission Based on Pricing
        let commissionPercentage = 0.10; // Under ₹1,500 (Bronze): 10%
        if (amount >= 1500 && amount < 3500) {
            commissionPercentage = 0.08; // ₹1,500 - ₹3,499 (Silver): 8%
        }
        else if (amount >= 3500 && amount < 6000) {
            commissionPercentage = 0.07; // ₹3,500 - ₹5,999 (Gold): 7%
        }
        else if (amount >= 6000) {
            commissionPercentage = 0.05; // ₹6,000 & Above (Platinum): 5%
        }
        let commissionAmount = amount * commissionPercentage;
        commissionAmount = Math.round(commissionAmount * 100) / 100; // Round to 2 decimal places
        if (commissionAmount <= 0)
            return;
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
    }
    catch (error) {
        console.error('[Commission] Error applying commission:', error);
        // Rethrow inside transaction to ensure consistency
        throw error;
    }
}
/**
 * Handles deduction of commission when a booking is cancelled.
 */
async function handleBookingCancellation(tx, bookingId) {
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
    }
    catch (error) {
        console.error('[Commission] Error handling booking cancellation commission:', error);
        throw error;
    }
}
/**
 * Handles partial deduction of commission when a passenger is cancelled from a booking.
 */
async function handlePartialBookingCancellation(tx, bookingId, refundRatio) {
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
            console.log(`[Commission] No commission transaction found to deduct for partially cancelled booking ${bookingId}`);
            return;
        }
        const salesManagerId = commissionTx.userId;
        const originalCommission = commissionTx.amount;
        const deductionAmount = Math.round(originalCommission * refundRatio * 100) / 100;
        if (deductionAmount <= 0)
            return;
        // 2. Decrement Sales Manager's Wallet Balance
        await tx.user.update({
            where: { id: salesManagerId },
            data: { walletBalance: { decrement: deductionAmount } }
        });
        // 3. Create a debit Wallet Transaction log
        await tx.walletTransaction.create({
            data: {
                userId: salesManagerId,
                amount: deductionAmount,
                type: 'DEBIT',
                bookingId,
                description: `Commission deduction (Partial): Booking ${bookingId} passenger cancelled`
            }
        });
        // 4. Create Audit Log
        await tx.auditLog.create({
            data: {
                action: 'SALES_COMMISSION_DEDUCTION',
                targetUserId: salesManagerId,
                performedByUserId: 'SYSTEM',
                details: `Deducted ₹${deductionAmount} commission from Sales Manager ${salesManagerId} because booking ${bookingId} was partially cancelled.`
            }
        });
        console.log(`[Commission] Successfully deducted ₹${deductionAmount} commission from Sales Manager ${salesManagerId} for partially cancelled booking ${bookingId}`);
    }
    catch (error) {
        console.error('[Commission] Error handling partial booking cancellation commission:', error);
        throw error;
    }
}
