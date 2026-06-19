"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const restrict_1 = require("../middleware/restrict");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const validation_1 = require("../utils/validation");
const notificationService_1 = require("../services/notificationService");
const commission_1 = require("../utils/commission");
const router = (0, express_1.Router)();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
router.post('/wallet-pay', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER', 'SALES_MANAGER']), restrict_1.requireActiveUser, async (req, res) => {
    const { amount, eventId, trainClass, trainNo, trainName, fromStation, toStation, journeyDate, passengers, mobile, email, passengerList } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!(0, validation_1.isValidIndianMobile)(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    try {
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Check & Deduct Balance
            const user = await tx.user.findUnique({
                where: { id: req.user.userId },
                select: { id: true, walletBalance: true, email: true, mobile: true }
            });
            if (!user || user.walletBalance < amount) {
                throw new Error('Insufficient wallet balance');
            }
            await tx.user.update({
                where: { id: user.id },
                data: { walletBalance: { decrement: amount } }
            });
            // 2. Create Wallet Transaction Log
            const walletTx = await tx.walletTransaction.create({
                data: {
                    userId: user.id,
                    amount,
                    type: 'DEBIT',
                    description: `Booking payment for Train ${trainNo || 'Unknown'}`
                }
            });
            // 3. Create Payment Record (Internal)
            const internalPaymentId = `WAL_${walletTx.id.substring(0, 8)}`;
            await tx.paymentRecord.create({
                data: {
                    orderId: `ORD_WAL_${Date.now()}`,
                    paymentId: internalPaymentId,
                    amount,
                    status: 'CAPTURED',
                    userId: user.id
                }
            });
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Passengers: ${passengers || 1}`;
            // 4. Resolve Event
            let resolvedEventId = eventId;
            if (!resolvedEventId && trainNo) {
                const journeyDateObj = journeyDate ? new Date(journeyDate) : new Date();
                const eventName = `Train ${trainNo}${trainName ? ' - ' + trainName : ''}: ${fromStation || '?'} → ${toStation || '?'}`;
                const description = `Wallet booking. Train: ${trainNo}. Journey: ${fromStation} to ${toStation} on ${journeyDateObj.toDateString()}. Passengers: ${pDesc}. Mobile: ${mobile || 'N/A'}.`;
                const event = await tx.event.create({
                    data: { name: eventName, description, date: journeyDateObj }
                });
                resolvedEventId = event.id;
            }
            if (!resolvedEventId)
                throw new Error('Could not resolve event');
            // 5. Create Booking
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(trainClass || '')) {
                category = 'AC';
            }
            const booking = await tx.booking.create({
                data: {
                    userId: user.id,
                    eventId: resolvedEventId,
                    paymentId: internalPaymentId,
                    status: 'CONFIRMED',
                    class: category
                }
            });
            await (0, commission_1.checkAndApplyCommission)(tx, user.id, amount, booking.id, trainNo);
            // 6. Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'WALLET_PAYMENT',
                    targetUserId: user.id,
                    performedByUserId: user.id,
                    details: `Paid ₹${amount} via wallet for Train ${trainNo}. New balance: ₹${user.walletBalance - amount}`
                }
            });
        });
        // Trigger notifications (non-blocking)
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { email: true, mobile: true }
            });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail && trainNo) {
                const eventName = `Train ${trainNo}: ${fromStation} → ${toStation}`;
                (0, notificationService_1.notifyBookingConfirmed)(targetEmail, eventName, targetMobile).catch(err => console.error('Wallet notification background error:', err));
            }
        }
        catch (notifErr) {
            console.error('Notification error:', notifErr);
        }
        return res.json({ success: true, message: 'Payment successful via Wallet' });
    }
    catch (error) {
        console.error('Wallet payment error:', error);
        return res.status(500).json({ error: error.message || 'Payment failed' });
    }
});
/**
 * POST /api/payments/wallet/create-order
 * Initiates a Razorpay order for wallet top-up.
 */
router.post('/wallet/create-order', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 100) {
        return res.status(400).json({ error: 'Minimum top-up amount is ₹100' });
    }
    try {
        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: 'INR',
            receipt: `rcpt_wallet_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        return res.json(order);
    }
    catch (error) {
        console.error('Razorpay order creation error:', error);
        return res.status(500).json({ error: 'Could not create payment order' });
    }
});
/**
 * POST /api/payments/wallet/verify-topup
 * Verifies Razorpay payment signature and credits the user's wallet.
 */
router.post('/wallet/verify-topup', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification details' });
    }
    try {
        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        // 2. Transactionally update user balance and log it
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Update User Balance
            const user = await tx.user.update({
                where: { id: req.user.userId },
                data: { walletBalance: { increment: amount } }
            });
            // Create Wallet Transaction
            await tx.walletTransaction.create({
                data: {
                    userId: req.user.userId,
                    amount,
                    type: 'CREDIT',
                    description: `Wallet top-up via Razorpay (ID: ${razorpay_payment_id})`
                }
            });
            // Create Payment Record
            await tx.paymentRecord.create({
                data: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    amount,
                    status: 'CAPTURED',
                    userId: req.user.userId
                }
            });
            // Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'WALLET_TOPUP',
                    targetUserId: req.user.userId,
                    performedByUserId: req.user.userId,
                    details: `Added ₹${amount} via Razorpay. New balance: ₹${user.walletBalance}`
                }
            });
            return user;
        });
        // 3. Notify user (optional, non-blocking)
        try {
            if (result.mobile) {
                await (0, notificationService_1.notifyPaymentReceived)(result.mobile, amount, razorpay_payment_id);
            }
        }
        catch (e) {
            console.error('Notification failed:', e);
        }
        return res.json({
            success: true,
            message: 'Wallet credited successfully',
            newBalance: result.walletBalance
        });
    }
    catch (error) {
        console.error('Wallet top-up verification error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * POST /api/payments/create-order
 * Initiates a standard Razorpay ticket booking order.
 */
router.post('/create-order', auth_1.requireAuth, async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid booking amount' });
    }
    try {
        const options = {
            amount: Math.round(amount * 100), // to paise
            currency: 'INR',
            receipt: `rcpt_booking_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });
    }
    catch (error) {
        console.error('Razorpay booking order creation error:', error);
        return res.status(500).json({ error: 'Failed to initiate booking with payment gateway' });
    }
});
/**
 * POST /api/payments/verify
 * Verifies Razorpay ticket booking payment and creates the Booking record.
 */
router.post('/verify', auth_1.requireAuth, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, trainNo, trainName, fromStation, toStation, journeyDate, passengers, mobile, email, amount, trainClass, passengerList } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment signature verification' });
    }
    if (!(0, validation_1.isValidIndianMobile)(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    try {
        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        // 2. Transactional Booking Creation
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Create Event
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Passengers: ${passengers}`;
            const eventName = `${trainName || 'Express'} (${trainNo}) - ${fromStation} to ${toStation}`;
            const description = `Razorpay ticket booking. Train: ${trainNo}. Route: ${fromStation} → ${toStation} on ${journeyDate}. Passengers: ${pDesc}. Mobile: ${mobile}. Paid: ₹${amount}`;
            const event = await tx.event.create({
                data: {
                    name: eventName,
                    description,
                    date: new Date(journeyDate),
                }
            });
            // Create Payment Record
            await tx.paymentRecord.create({
                data: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    amount: Number(amount),
                    status: 'CAPTURED',
                    userId: req.user.userId
                }
            });
            // Resolve Class Category
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(String(trainClass || '').toUpperCase())) {
                category = 'AC';
            }
            // Create Booking
            const booking = await tx.booking.create({
                data: {
                    userId: req.user.userId,
                    eventId: event.id,
                    paymentId: razorpay_payment_id,
                    status: 'CONFIRMED',
                    class: category
                }
            });
            await (0, commission_1.checkAndApplyCommission)(tx, req.user.userId, Number(amount), booking.id, trainNo);
            return { booking, eventName };
        });
        // 3. Notify (Non-blocking)
        try {
            const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail) {
                (0, notificationService_1.notifyBookingConfirmed)(targetEmail, result.eventName, targetMobile).catch(err => console.error('Verify notification background error:', err));
            }
        }
        catch (e) {
            console.error('Notification log error:', e);
        }
        return res.json({ success: true, bookingId: result.booking.id });
    }
    catch (error) {
        console.error('Booking verification error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * POST /api/payments/offline-pay
 * Creates a booking without actual payment gateway (for Admin Testing).
 */
router.post('/offline-pay', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { amount, trainNo, trainName, fromStation, toStation, journeyDate, passengers, mobile, email, trainClass, passengerList } = req.body;
    if (!(0, validation_1.isValidIndianMobile)(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Passengers: ${passengers}`;
            const eventName = `${trainName || 'Express'} (${trainNo}) - ${fromStation} to ${toStation}`;
            const description = `OFFLINE/ADMIN booking. Train: ${trainNo}. Route: ${fromStation} → ${toStation} on ${journeyDate}. Passengers: ${pDesc}. Mobile: ${mobile}. Amount: ₹${amount}`;
            const event = await tx.event.create({
                data: {
                    name: eventName,
                    description,
                    date: new Date(journeyDate),
                }
            });
            const offlinePaymentId = `OFF_${Date.now()}`;
            await tx.paymentRecord.create({
                data: {
                    orderId: `ORD_OFF_${Date.now()}`,
                    paymentId: offlinePaymentId,
                    amount: Number(amount),
                    status: 'CAPTURED',
                    userId: req.user.userId
                }
            });
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(String(trainClass || '').toUpperCase())) {
                category = 'AC';
            }
            const booking = await tx.booking.create({
                data: {
                    userId: req.user.userId,
                    eventId: event.id,
                    paymentId: offlinePaymentId,
                    status: 'CONFIRMED',
                    class: category
                }
            });
            await (0, commission_1.checkAndApplyCommission)(tx, req.user.userId, Number(amount), booking.id, trainNo);
            return { booking, eventName };
        });
        // Trigger notifications for offline payment (non-blocking)
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { email: true, mobile: true }
            });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail) {
                (0, notificationService_1.notifyBookingConfirmed)(targetEmail, result.eventName, targetMobile).catch(err => console.error('Offline notification background error:', err));
            }
        }
        catch (notifErr) {
            console.error('Offline notification error:', notifErr);
        }
        return res.json({ success: true, bookingId: result.booking.id });
    }
    catch (error) {
        console.error('Offline payment error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
