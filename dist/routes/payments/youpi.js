"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const cache_1 = require("../../utils/cache");
const commission_1 = require("../../utils/commission");
const validation_1 = require("../../utils/validation");
const notificationService_1 = require("../../services/notificationService");
const auditService_1 = require("../../services/auditService");
const router = (0, express_1.Router)();
// Helper to retrieve active YouPI gateway configuration from DB or env
async function getYouPiConfig() {
    try {
        const settings = await prisma_1.prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
        return {
            enabled: settings?.youpiEnabled ?? (process.env.YOUPI_ENABLED === 'true'),
            baseUrl: (settings?.youpiBaseUrl || process.env.YOUPI_BASE_URL || '').replace(/\/+$/, ''),
            merchantKey: settings?.youpiMerchantKey || process.env.YOUPI_MERCHANT_KEY || '',
            webhookSecret: settings?.youpiWebhookSecret || process.env.YOUPI_WEBHOOK_SECRET || '',
            vpa: settings?.youpiVpa || process.env.YOUPI_VPA || 'ticketspro@upi',
            merchantName: settings?.youpiMerchantName || process.env.YOUPI_MERCHANT_NAME || 'TicketsPro'
        };
    }
    catch {
        return {
            enabled: process.env.YOUPI_ENABLED === 'true',
            baseUrl: (process.env.YOUPI_BASE_URL || '').replace(/\/+$/, ''),
            merchantKey: process.env.YOUPI_MERCHANT_KEY || '',
            webhookSecret: process.env.YOUPI_WEBHOOK_SECRET || '',
            vpa: process.env.YOUPI_VPA || 'ticketspro@upi',
            merchantName: process.env.YOUPI_MERCHANT_NAME || 'TicketsPro'
        };
    }
}
/**
 * POST /api/payments/youpi/create-order
 * Creates a YouPI UPI order session for ticket booking or wallet top-up.
 */
router.post('/create-order', auth_1.requireAuth, async (req, res) => {
    // In Testing Phase: Restrict YouPI checkout to SUPER_ADMIN only
    if (req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Direct UPI gateway is currently in testing mode and only available to Super Admin.' });
    }
    const { amount, type = 'BOOKING', // 'BOOKING' | 'WALLET_TOPUP'
    // Booking metadata:
    trainNo, trainName, fromStation, toStation, journeyDate, passengers, mobile, email, trainClass, passengerList, walletAmountUsed = 0 } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid payment amount' });
    }
    if (type === 'BOOKING' && mobile && !(0, validation_1.isValidIndianMobile)(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    try {
        const config = await getYouPiConfig();
        const userId = req.user.userId;
        const orderId = `TP_YP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const amountPaise = Math.round(numAmount * 100);
        let upiUrl = '';
        let qrString = '';
        let expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins validity
        // If YouPI server is configured, register order with remote gateway
        if (config.baseUrl && config.merchantKey) {
            try {
                console.log(`[YouPI] Requesting remote order creation at ${config.baseUrl}/v2/orders/create for ${orderId}`);
                const response = await axios_1.default.post(`${config.baseUrl}/v2/orders/create`, {
                    merchantKey: config.merchantKey,
                    orderId,
                    amountPaise,
                    customerPhone: mobile || req.user?.email || '9999999999',
                    customerEmail: email || req.user?.email || 'customer@ticketspro.in',
                    note: `TicketsPro ${type === 'BOOKING' ? `Train ${trainNo || ''}` : 'Wallet Recharge'}`
                }, { timeout: 8000 });
                if (response.data) {
                    upiUrl = response.data.upiUrl || response.data.paymentUrl || '';
                    qrString = response.data.qrString || response.data.upiUrl || '';
                    if (response.data.expiresAt)
                        expiresAt = response.data.expiresAt;
                }
            }
            catch (remoteErr) {
                console.warn(`[YouPI] Remote server order call failed (${remoteErr.message}). Falling back to sovereign direct UPI URI.`);
            }
        }
        // Sovereign Fallback / Direct UPI URI Generation:
        // Follows NPCI Standard Universal Product Identifier URI specs (UPI 2.0 compliant)
        if (!upiUrl) {
            const encodedName = encodeURIComponent(config.merchantName);
            const encodedNote = encodeURIComponent(`TicketsPro Order ${orderId}`);
            upiUrl = `upi://pay?pa=${config.vpa}&pn=${encodedName}&am=${numAmount.toFixed(2)}&tr=${orderId}&cu=INR&tn=${encodedNote}`;
            qrString = upiUrl;
        }
        // Cache order session for 30 minutes in Redis / Memory
        const sessionPayload = {
            orderId,
            userId,
            amount: numAmount,
            amountPaise,
            type,
            status: 'PENDING',
            upiUrl,
            vpa: config.vpa,
            merchantName: config.merchantName,
            // Booking Details
            trainNo,
            trainName,
            fromStation,
            toStation,
            journeyDate,
            passengers,
            mobile,
            email,
            trainClass,
            passengerList,
            walletAmountUsed,
            createdAt: Date.now()
        };
        await cache_1.CacheService.set(`youpi:order:${orderId}`, JSON.stringify(sessionPayload), 1800);
        return res.json({
            success: true,
            orderId,
            amount: numAmount,
            amountPaise,
            upiUrl,
            qrString,
            vpa: config.vpa,
            merchantName: config.merchantName,
            expiresAt
        });
    }
    catch (error) {
        console.error('[YouPI] create-order error:', error);
        return res.status(500).json({ error: error.message || 'Failed to initiate YouPI payment order' });
    }
});
/**
 * Internal helper to fulfill a paid YouPI order idempotently.
 */
async function fulfillYouPiOrder(orderData, utr) {
    const orderId = orderData.orderId;
    const userId = orderData.userId;
    const paymentId = utr ? `YP_${utr}` : `YP_${orderId}`;
    // 1. Idempotency Check: check if already exists in DB
    const existing = await prisma_1.prisma.paymentRecord.findFirst({
        where: {
            OR: [
                { orderId },
                { paymentId }
            ]
        }
    });
    if (existing) {
        console.log(`[YouPI] Order ${orderId} already fulfilled with PaymentRecord ${existing.id}`);
        return { alreadyFulfilled: true, paymentRecord: existing };
    }
    if (orderData.type === 'WALLET_TOPUP') {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { walletBalance: { increment: orderData.amount } }
            });
            await tx.walletTransaction.create({
                data: {
                    userId,
                    amount: orderData.amount,
                    type: 'CREDIT',
                    description: `Wallet top-up via Direct UPI (UTR: ${utr || orderId})`
                }
            });
            const paymentRecord = await tx.paymentRecord.create({
                data: {
                    orderId,
                    paymentId,
                    amount: orderData.amount,
                    status: 'CAPTURED',
                    userId
                }
            });
            return { user, paymentRecord };
        });
        // Update cached session
        orderData.status = 'SUCCESS';
        orderData.utr = utr;
        await cache_1.CacheService.set(`youpi:order:${orderId}`, JSON.stringify(orderData), 3600);
        return { success: true, paymentRecord: result.paymentRecord };
    }
    // Default: Ticket Booking Fulfillment
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const pDesc = Array.isArray(orderData.passengerList)
            ? orderData.passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
            : `Passengers: ${orderData.passengers}`;
        const eventName = `${orderData.trainName || 'Express'} (${orderData.trainNo}) - ${orderData.fromStation} to ${orderData.toStation}`;
        const description = `YouPI Direct UPI Ticket Booking. Train: ${orderData.trainNo}. Route: ${orderData.fromStation} → ${orderData.toStation} on ${orderData.journeyDate}. Passengers: ${pDesc}. Mobile: ${orderData.mobile}. Amount: ₹${orderData.amount}. UTR: ${utr || 'N/A'}`;
        const event = await tx.event.create({
            data: {
                name: eventName,
                description,
                date: new Date(orderData.journeyDate),
            }
        });
        const paymentRecord = await tx.paymentRecord.create({
            data: {
                orderId,
                paymentId,
                amount: Number(orderData.amount),
                status: 'CAPTURED',
                userId
            }
        });
        // Resolve Class Category
        let category = 'SLEEPER';
        if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(String(orderData.trainClass || '').toUpperCase())) {
            category = 'AC';
        }
        const booking = await tx.booking.create({
            data: {
                userId,
                eventId: event.id,
                paymentId,
                status: 'CONFIRMED',
                class: category
            }
        });
        // If wallet balance was partially used, deduct it
        if (orderData.walletAmountUsed && orderData.walletAmountUsed > 0) {
            await tx.user.update({
                where: { id: userId },
                data: { walletBalance: { decrement: orderData.walletAmountUsed } }
            });
            await tx.walletTransaction.create({
                data: {
                    userId,
                    amount: orderData.walletAmountUsed,
                    type: 'DEBIT',
                    description: `Used for Train Booking ${booking.id} (Order: ${orderId})`
                }
            });
        }
        await (0, commission_1.checkAndApplyCommission)(tx, userId, Number(orderData.amount), booking.id, orderData.trainNo);
        return { booking, eventName };
    });
    // Send customer notification (Non-blocking)
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        const targetEmail = orderData.email || user?.email;
        const targetMobile = orderData.mobile || user?.mobile || undefined;
        if (targetEmail) {
            const pDesc = Array.isArray(orderData.passengerList)
                ? orderData.passengerList.map((p, i) => `0${i + 1} ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('<br/>')
                : `Passengers: ${orderData.passengers}`;
            const emailDetails = {
                journeyDate: orderData.journeyDate ? new Date(orderData.journeyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
                passengerDetails: pDesc,
                transactionId: utr || orderId,
                amount: orderData.amount,
                trainClass: orderData.trainClass
            };
            (0, notificationService_1.notifyBookingConfirmed)(targetEmail, result.eventName, targetMobile, emailDetails).catch(err => console.error('[YouPI] Notification error:', err));
        }
    }
    catch (e) {
        console.error('[YouPI] Notification log error:', e);
    }
    // Update cached session
    orderData.status = 'SUCCESS';
    orderData.bookingId = result.booking.id;
    orderData.utr = utr;
    await cache_1.CacheService.set(`youpi:order:${orderId}`, JSON.stringify(orderData), 3600);
    return { success: true, bookingId: result.booking.id };
}
/**
 * POST /api/payments/youpi/webhook
 * Public Webhook Endpoint called by YouPI-PG Gateway when payment is verified.
 */
router.post('/webhook', async (req, res) => {
    try {
        const config = await getYouPiConfig();
        const rawSignature = (req.headers['x-gateway-signature'] ||
            req.headers['x-youpi-signature'] ||
            req.headers['x-signature']);
        const signature = rawSignature ? rawSignature.replace(/^sha256=/, '') : '';
        // If webhook secret is configured, verify HMAC signature
        if (config.webhookSecret) {
            if (!signature) {
                console.warn('[YouPI Webhook] Rejected: Missing signature header.');
                return res.status(401).json({ error: 'Missing webhook signature' });
            }
            const expected = crypto_1.default
                .createHmac('sha256', config.webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');
            if (signature !== expected) {
                console.warn('[YouPI Webhook] Rejected: Invalid HMAC signature.');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        }
        const { event, orderId: bOrderId, order_id, status, utr: bUtr, rrn, vpa, amountPaise } = req.body;
        const orderId = bOrderId || order_id;
        const utr = bUtr || rrn;
        console.log(`[YouPI Webhook] Received event: ${event || status} for Order: ${orderId}, UTR: ${utr}`);
        const isSuccess = event === 'SUCCESS' || event === 'payment.success' || event === 'payment.captured' || status === 'SUCCESS' || status === 'PAID';
        if (!isSuccess) {
            return res.json({ status: 'ignored', message: `Event ${event || status} not actionable.` });
        }
        // Retrieve order session
        let orderData = null;
        const cached = await cache_1.CacheService.get(`youpi:order:${orderId}`);
        if (cached) {
            try {
                orderData = JSON.parse(cached);
            }
            catch { }
        }
        if (!orderData) {
            console.warn(`[YouPI Webhook] Order ${orderId} session not found in cache. Checking database...`);
            // Check if already in DB
            const existing = await prisma_1.prisma.paymentRecord.findFirst({ where: { orderId } });
            if (existing) {
                return res.json({ success: true, message: 'Already processed' });
            }
            return res.status(404).json({ error: 'Order not found or expired.' });
        }
        const fulfillment = await fulfillYouPiOrder(orderData, utr || '');
        return res.json({ success: true, fulfillment });
    }
    catch (error) {
        console.error('[YouPI Webhook] Internal Error:', error);
        return res.status(500).json({ error: error.message || 'Webhook processing failed' });
    }
});
/**
 * GET /api/payments/youpi/status/:orderId
 * Polls payment status for an active order session.
 */
router.get('/status/:orderId', async (req, res) => {
    const orderId = String(req.params.orderId);
    try {
        // 1. Check in-memory / Redis cache
        const cached = await cache_1.CacheService.get(`youpi:order:${orderId}`);
        if (cached) {
            const orderData = JSON.parse(cached);
            if (orderData.status === 'SUCCESS') {
                return res.json({
                    status: 'SUCCESS',
                    bookingId: orderData.bookingId,
                    utr: orderData.utr
                });
            }
        }
        // 2. Check Database for confirmed PaymentRecord
        const paymentRecord = await prisma_1.prisma.paymentRecord.findFirst({
            where: { orderId, status: 'CAPTURED' }
        });
        if (paymentRecord) {
            const booking = await prisma_1.prisma.booking.findFirst({
                where: { paymentId: paymentRecord.paymentId }
            });
            return res.json({
                status: 'SUCCESS',
                bookingId: booking?.id || null,
                paymentId: paymentRecord.paymentId
            });
        }
        // 3. Active Check: If YouPI server is configured, query remote status
        const config = await getYouPiConfig();
        if (config.baseUrl && config.merchantKey) {
            try {
                const response = await axios_1.default.get(`${config.baseUrl}/v2/orders/status?orderId=${orderId}`, {
                    headers: { 'Authorization': `Bearer ${config.merchantKey}` },
                    timeout: 4000
                });
                if (response.data?.status === 'SUCCESS' || response.data?.status === 'PAID') {
                    console.log(`[YouPI Status] Remote status returned PAID for ${orderId}. Fulfilling order...`);
                    let orderData = null;
                    if (cached) {
                        try {
                            orderData = JSON.parse(cached);
                        }
                        catch { }
                    }
                    if (orderData) {
                        const fulfillment = await fulfillYouPiOrder(orderData, response.data?.utr || '');
                        return res.json({
                            status: 'SUCCESS',
                            bookingId: fulfillment.bookingId || null,
                            utr: response.data?.utr
                        });
                    }
                }
            }
            catch (err) {
                // Ignore remote poll errors and continue returning current local state
            }
        }
        return res.json({ status: 'PENDING' });
    }
    catch (error) {
        console.error('[YouPI] status check error:', error);
        return res.status(500).json({ error: 'Status check failed' });
    }
});
/**
 * POST /api/payments/youpi/verify-utr
 * Customer manual entry of bank 12-digit UTR/Ref for assisted instant verification.
 */
router.post('/verify-utr', auth_1.requireAuth, async (req, res) => {
    const { orderId, utr } = req.body;
    if (!orderId || !utr || String(utr).trim().length < 6) {
        return res.status(400).json({ error: 'Please provide a valid Bank Ref / UTR number (at least 6-12 digits).' });
    }
    try {
        const cleanUtr = String(utr).trim();
        const cached = await cache_1.CacheService.get(`youpi:order:${orderId}`);
        if (!cached) {
            return res.status(404).json({ error: 'Order session expired or not found. Please create a new booking.' });
        }
        const orderData = JSON.parse(cached);
        if (orderData.status === 'SUCCESS') {
            return res.json({ success: true, bookingId: orderData.bookingId, alreadyPaid: true });
        }
        // Check if UTR is already used by another payment
        const existingUtr = await prisma_1.prisma.paymentRecord.findUnique({
            where: { paymentId: `YP_${cleanUtr}` }
        });
        if (existingUtr) {
            return res.status(400).json({ error: 'This UTR has already been claimed for another transaction.' });
        }
        // If YouPI server is active, verify with YouPI verification endpoint
        const config = await getYouPiConfig();
        if (config.baseUrl && config.merchantKey) {
            try {
                const response = await axios_1.default.post(`${config.baseUrl}/v2/orders/verify-utr`, {
                    merchantKey: config.merchantKey,
                    orderId,
                    utr: cleanUtr
                }, { timeout: 6000 });
                if (response.data?.success || response.data?.verified) {
                    const fulfillment = await fulfillYouPiOrder(orderData, cleanUtr);
                    return res.json({ success: true, bookingId: fulfillment.bookingId });
                }
            }
            catch (err) {
                console.warn('[YouPI] Remote UTR verification failed, continuing with direct confirmation flow.');
            }
        }
        // Assisted Instant Confirmation: Fulfill with the customer's provided UTR
        const fulfillment = await fulfillYouPiOrder(orderData, cleanUtr);
        await (0, auditService_1.createAuditLog)({
            action: 'YOUPI_CUSTOMER_UTR_VERIFICATION',
            performedByUserId: req.user.userId,
            details: `Customer submitted UTR ${cleanUtr} for Order ${orderId}`
        });
        return res.json({ success: true, bookingId: fulfillment.bookingId });
    }
    catch (error) {
        console.error('[YouPI] verify-utr error:', error);
        return res.status(500).json({ error: error.message || 'UTR verification failed' });
    }
});
exports.default = router;
