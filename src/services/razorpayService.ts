import { prisma } from '../prisma';

export interface ParsedDetails {
    type: 'UPI' | 'BANK';
    vpa?: string;
    accountNumber?: string;
    ifsc?: string;
}

export function parseWithdrawalDetails(details: string): ParsedDetails {
    const cleaned = details.trim();
    
    // Check for UPI VPA
    // Handles formats like "UPI: test@upi", "test@upi", "upi ID: test@okaxis"
    const upiMatch = cleaned.match(/(?:upi(?:\s*id)?:?\s*)?([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+)/i);
    if (upiMatch && !cleaned.toLowerCase().includes('acc') && !cleaned.toLowerCase().includes('ifsc')) {
        return {
            type: 'UPI',
            vpa: upiMatch[1].trim()
        };
    }
    
    // Check for Bank Account
    // Account Number: looks for "acc: 1234..." or "account: 1234..." or "acc number: 1234..."
    const accMatch = cleaned.match(/(?:acc(?:ount)?(?:\s*no|\s*number)?:?\s*)([a-zA-Z0-9]+)/i);
    // IFSC Code: looks for "ifsc: SBIN0001234"
    const ifscMatch = cleaned.match(/(?:ifsc:?\s*)([a-zA-Z0-9]{11})/i);
    
    if (accMatch && ifscMatch) {
        return {
            type: 'BANK',
            accountNumber: accMatch[1].trim(),
            ifsc: ifscMatch[1].trim().toUpperCase()
        };
    }
    
    // Fallback/loose parsing
    // Search for 11-char IFSC code anywhere in the string
    const looseIfscMatch = cleaned.match(/[A-Z]{4}0[A-Z0-9]{6}/i);
    // Search for account number: any contiguous sequence of 9-18 digits
    const numbers = cleaned.match(/\b\d{9,18}\b/g) || [];
    let looseAccNum: string | undefined = undefined;
    if (numbers.length > 0) {
        looseAccNum = numbers[0];
    }
    
    if (looseAccNum && looseIfscMatch) {
        return {
            type: 'BANK',
            accountNumber: looseAccNum,
            ifsc: looseIfscMatch[0].toUpperCase()
        };
    }
    
    // Final check: if it's just a raw UPI ID without prefix (e.g. "someone@bank")
    const simpleUpiMatch = cleaned.match(/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+$/);
    if (simpleUpiMatch) {
        return {
            type: 'UPI',
            vpa: cleaned
        };
    }
    
    throw new Error('Unable to parse UPI VPA or Bank Account/IFSC details. Please provide a valid UPI ID (e.g. user@upi) or Bank Details (e.g. Acc: 1234567890, IFSC: SBIN0001234).');
}

async function callRazorpayAPI(endpoint: string, method: 'POST' | 'GET', body?: any) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not configured');
    }
    
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
        },
        body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    if (!response.ok) {
        const desc = data.error?.description || data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`;
        throw new Error(desc);
    }
    return data;
}

export async function processPayout(requestId: string): Promise<void> {
    console.log(`[Razorpay Payout] Starting processing for Request ID: ${requestId}`);
    
    const request = await prisma.withdrawalRequest.findUnique({
        where: { id: requestId },
        include: { user: true }
    });
    
    if (!request) {
        console.error(`[Razorpay Payout] Withdrawal request ${requestId} not found in database.`);
        return;
    }
    
    if (request.status !== 'PENDING') {
        console.log(`[Razorpay Payout] Request ${requestId} is already in state: ${request.status}. Skipping.`);
        return;
    }
    
    // Check for Graceful Degradation / Fallback configuration
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayXAccount = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    
    if (!keyId || !keySecret || !razorpayXAccount) {
        console.warn(`[Razorpay Payout] Missing credentials. Fallback to manual flow. RAZORPAYX_ACCOUNT_NUMBER is ${razorpayXAccount ? 'set' : 'missing'}.`);
        return;
    }
    
    try {
        // 1. Parse details
        const parsed = parseWithdrawalDetails(request.details || '');
        
        // 2. Clean name and details for contact creation
        const cleanName = (request.user.name || 'User').replace(/[^a-zA-Z0-9.\s'-]/g, '').substring(0, 50).trim() || 'User';
        const cleanEmail = request.user.email;
        const cleanContact = request.user.mobile && request.user.mobile.length === 10 ? request.user.mobile : undefined;
        
        console.log(`[Razorpay Payout] Creating contact for request ${requestId}`);
        const contactResponse = await callRazorpayAPI('/contacts', 'POST', {
            name: cleanName,
            email: cleanEmail,
            contact: cleanContact,
            type: 'customer',
            reference_id: request.user.id
        });
        const contactId = contactResponse.id;
        
        // 3. Create Fund Account
        console.log(`[Razorpay Payout] Creating fund account of type ${parsed.type} for request ${requestId}`);
        let fundAccountBody: any = {
            contact_id: contactId,
            account_type: parsed.type === 'UPI' ? 'vpa' : 'bank_account'
        };
        
        if (parsed.type === 'UPI') {
            fundAccountBody.vpa = { address: parsed.vpa };
        } else {
            fundAccountBody.bank_account = {
                name: cleanName,
                ifsc: parsed.ifsc,
                account_number: parsed.accountNumber
            };
        }
        
        const fundResponse = await callRazorpayAPI('/fund_accounts', 'POST', fundAccountBody);
        const fundAccountId = fundResponse.id;
        
        // 4. Create Payout
        console.log(`[Razorpay Payout] Creating payout of ₹${request.amount} for request ${requestId}`);
        const payoutResponse = await callRazorpayAPI('/payouts', 'POST', {
            account_number: razorpayXAccount,
            fund_account_id: fundAccountId,
            amount: Math.round(request.amount * 100), // paise
            currency: 'INR',
            mode: parsed.type === 'UPI' ? 'UPI' : 'IMPS',
            purpose: 'payout',
            queue_if_low_balance: true,
            reference_id: request.id
        });
        
        const rzpStatus = payoutResponse.status;
        console.log(`[Razorpay Payout] Payout response status: ${rzpStatus} for request ${requestId}`);
        
        if (rzpStatus === 'rejected' || rzpStatus === 'failed') {
            throw new Error(`Razorpay payout status returned as: ${rzpStatus}`);
        }
        
        // Success / Processing
        // Update request status based on Razorpay payout status
        const finalStatus = rzpStatus === 'processed' ? 'COMPLETED' : 'PROCESSING';
        
        await prisma.withdrawalRequest.update({
            where: { id: requestId },
            data: {
                status: finalStatus,
                adminComment: `Payout created via Razorpay API. ID: ${payoutResponse.id}. Status: ${rzpStatus}`,
                updatedAt: new Date()
            }
        });
        
        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                action: finalStatus === 'COMPLETED' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_PROCESSING',
                targetUserId: request.userId,
                performedByUserId: request.userId,
                details: `Auto-processed payout of ₹${request.amount} via Razorpay API. Status: ${finalStatus}`
            }
        });
        
        console.log(`[Razorpay Payout] Successfully completed processing for Request ID: ${requestId}`);
        
    } catch (err: any) {
        console.error(`[Razorpay Payout] Error during auto-payout for request ${requestId}:`, err);
        
        // Failed - refund the locked balance
        const totalRefund = request.amount + request.charge;
        const errorMessage = err.message || 'Razorpay Payout API Error';
        
        try {
            await prisma.$transaction(async (tx) => {
                // Update request status to FAILED and store error
                await tx.withdrawalRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'FAILED',
                        adminComment: `Auto-payout failed: ${errorMessage.substring(0, 200)}`,
                        updatedAt: new Date()
                    }
                });
                
                // Refund user balance
                await tx.user.update({
                    where: { id: request.userId },
                    data: {
                        walletBalance: {
                            increment: totalRefund
                        }
                    }
                });
                
                // Create wallet transaction credit log
                await tx.walletTransaction.create({
                    data: {
                        userId: request.userId,
                        amount: totalRefund,
                        type: 'CREDIT',
                        description: `Withdrawal Failed (Auto-payout) - Funds Restored (₹${request.amount} + ₹${request.charge} fee)`
                    }
                });
                
                // Audit Log
                await tx.auditLog.create({
                    data: {
                        action: 'WITHDRAWAL_FAILED',
                        targetUserId: request.userId,
                        performedByUserId: request.userId,
                        details: `Auto-payout failed: ${errorMessage}. Refunded ₹${totalRefund} back to user.`
                    }
                });
            });
            console.log(`[Razorpay Payout] Refunded ₹${totalRefund} successfully for request ${requestId}`);
        } catch (refundErr) {
            console.error(`[Razorpay Payout] Critical: Failed to process refund for request ${requestId}:`, refundErr);
        }
    }
}

export async function processTicketRefund(refundId: string): Promise<void> {
    console.log(`[Razorpay Refund] Starting processing for Refund ID: ${refundId}`);
    
    const refund = await prisma.refundRecord.findUnique({
        where: { id: refundId },
        include: { user: true }
    });
    
    if (!refund) {
        console.error(`[Razorpay Refund] Refund record ${refundId} not found.`);
        return;
    }
    
    if (refund.status !== 'AUTOMATED_PENDING') {
        console.log(`[Razorpay Refund] Refund ${refundId} is already in state: ${refund.status}. Skipping.`);
        return;
    }
    
    // Check if wallet payment
    if (refund.paymentId.startsWith('WAL_')) {
        console.log(`[Razorpay Refund] Internal Wallet Payment detected for refund ${refundId}. Processing internal refund.`);
        try {
            await prisma.$transaction(async (tx) => {
                // Update user wallet balance
                await tx.user.update({
                    where: { id: refund.userId },
                    data: {
                        walletBalance: {
                            increment: refund.amount
                        }
                    }
                });
                
                // Create wallet transaction
                await tx.walletTransaction.create({
                    data: {
                        userId: refund.userId,
                        amount: refund.amount,
                        type: 'CREDIT',
                        description: `Internal Refund for Booking (Payment ID: ${refund.paymentId})`
                    }
                });
                
                // Update refund record to completed
                await tx.refundRecord.update({
                    where: { id: refundId },
                    data: {
                        status: 'COMPLETED',
                        reason: refund.reason ? `${refund.reason} (Refunded to wallet)` : 'Refunded to wallet',
                        updatedAt: new Date()
                    }
                });
                
                // Audit Log
                await tx.auditLog.create({
                    data: {
                        action: 'REFUND_COMPLETED',
                        targetUserId: refund.userId,
                        performedByUserId: refund.userId,
                        details: `Internally refunded ₹${refund.amount} to wallet for payment ${refund.paymentId}`
                    }
                });
            });
            console.log(`[Razorpay Refund] Internal wallet refund completed successfully for refund ${refundId}`);
        } catch (err: any) {
            console.error(`[Razorpay Refund] Internal wallet refund failed for refund ${refundId}:`, err);
            await prisma.refundRecord.update({
                where: { id: refundId },
                data: {
                    status: 'FAILED',
                    originalFailureReason: err.message || 'Internal wallet transaction error',
                    updatedAt: new Date()
                }
            });
        }
        return;
    }
    
    // Standard Razorpay PG Refund
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
        console.warn(`[Razorpay Refund] Missing Razorpay credentials. Leaving refund ${refundId} as AUTOMATED_PENDING.`);
        return;
    }
    
    try {
        console.log(`[Razorpay Refund] Creating Razorpay PG Refund of ₹${refund.amount} for payment ${refund.paymentId}`);
        const response = await callRazorpayAPI(`/payments/${refund.paymentId}/refund`, 'POST', {
            amount: Math.round(refund.amount * 100), // paise
            notes: {
                refund_id: refund.id,
                reason: refund.reason || 'Booking cancelled'
            }
        });
        
        console.log(`[Razorpay Refund] Razorpay refund API response for ${refundId}:`, JSON.stringify(response));
        
        await prisma.refundRecord.update({
            where: { id: refundId },
            data: {
                status: 'COMPLETED',
                razorpayRefundId: response.id,
                updatedAt: new Date()
            }
        });
        
        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'REFUND_COMPLETED',
                targetUserId: refund.userId,
                performedByUserId: refund.userId,
                details: `Refund of ₹${refund.amount} completed via Razorpay PG. Refund ID: ${response.id}`
            }
        });
        
        console.log(`[Razorpay Refund] Razorpay refund completed successfully for refund ID: ${refundId}`);
        
    } catch (err: any) {
        console.error(`[Razorpay Refund] Razorpay PG refund failed for refund ${refundId}:`, err);
        
        // Update refund status to FAILED and store the reason
        await prisma.refundRecord.update({
            where: { id: refundId },
            data: {
                status: 'FAILED',
                originalFailureReason: err.message || 'Razorpay PG Refund API error',
                updatedAt: new Date()
            }
        });
        
        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'REFUND_FAILED',
                targetUserId: refund.userId,
                performedByUserId: refund.userId,
                details: `Refund of ₹${refund.amount} failed: ${err.message}`
            }
        });
    }
}

