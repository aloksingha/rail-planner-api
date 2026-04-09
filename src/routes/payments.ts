import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireActiveUser } from '../middleware/restrict';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { notifyBookingConfirmed, notifyPaymentReceived } from '../services/notificationService';

const router = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

router.post('/wallet-pay', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), requireActiveUser, async (req, res) => {
    const {
        amount,
        eventId,
        trainClass,
        trainNo,
        trainName,
        fromStation,
        toStation,
        journeyDate,
        passengers,
        mobile,
        passengerList
    } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Check & Deduct Balance
            const user = await tx.user.findUnique({
                where: { id: req.user!.userId },
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
                ? passengerList.map((p: any) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Count: ${passengers || 1}`;

            const fullPassengerDesc = `Passengers: ${pDesc}`;

            // 4. Resolve Event
            let resolvedEventId = eventId;
            if (!resolvedEventId && trainNo) {
                const journeyDateObj = journeyDate ? new Date(journeyDate) : new Date();
                const eventName = `Train ${trainNo}${trainName ? ' - ' + trainName : ''}: ${fromStation || '?'} → ${toStation || '?'}`;
                const description = `Wallet booking. Train: ${trainNo}. Journey: ${fromStation} to ${toStation} on ${journeyDateObj.toDateString()}. ${fullPassengerDesc}. Mobile: ${mobile || 'N/A'}.`;

                const event = await tx.event.create({
                    data: { name: eventName, description, date: journeyDateObj }
                });
                resolvedEventId = event.id;
            }

            if (!resolvedEventId) throw new Error('Could not resolve event');

            // 5. Create Booking
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(trainClass || '')) {
                category = 'AC';
            }

            await tx.booking.create({
                data: {
                    userId: user.id,
                    eventId: resolvedEventId,
                    paymentId: internalPaymentId,
                    status: 'CONFIRMED',
                    class: category
                }
            });

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
            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { email: true, mobile: true }
            });
            if (user && trainNo) {
                const eventName = `Train ${trainNo}: ${fromStation} → ${toStation}`;
                await notifyBookingConfirmed(user.email, eventName, user.mobile || undefined);
            }
        } catch (notifErr) { console.error('Notification error:', notifErr); }

        return res.json({ success: true, message: 'Payment successful via Wallet' });
    } catch (error: any) {
        console.error('Wallet payment error:', error);
        return res.status(500).json({ error: error.message || 'Payment failed' });
    }
});

/**
 * POST /api/payments/offline-pay
 * Internal TESTING route for Admins to create bookings without actual payment.
 */
router.post('/offline-pay', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const {
        amount,
        trainClass,
        trainNo,
        trainName,
        fromStation,
        toStation,
        journeyDate,
        passengers,
        mobile,
        passengerList
    } = req.body;

    try {
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: req.user!.userId },
                select: { id: true, email: true }
            });

            if (!user) throw new Error('User not found');

            const pDesc = Array.isArray(passengerList) 
                ? passengerList.map((p: any) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Count: ${passengers || 1}`;

            const fullPassengerDesc = `Passengers: ${pDesc}`;
            const journeyDateObj = journeyDate ? new Date(journeyDate) : new Date();
            const eventName = `OFFLINE: ${trainNo}${trainName ? ' - ' + trainName : ''}: ${fromStation || '?'} → ${toStation || '?'}`;
            const description = `TEST BOOKING (Admin Offline Mode). Train: ${trainNo}. Journey: ${fromStation} to ${toStation} on ${journeyDateObj.toDateString()}. ${fullPassengerDesc}. Mobile: ${mobile || 'N/A'}. Amount Saved: ₹${amount || 0}`;

            // 1. Create Event
            const event = await tx.event.create({
                data: { name: eventName, description, date: journeyDateObj }
            });

            // 2. Resolve Category
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(String(trainClass || '').toUpperCase())) {
                category = 'AC';
            }

            // 3. Create Booking
            await tx.booking.create({
                data: {
                    userId: user.id,
                    eventId: event.id,
                    paymentId: `TEST_OFFLINE_${Date.now()}`,
                    status: 'CONFIRMED',
                    class: category
                }
            });

            // 4. Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'OFFLINE_TEST_BOOKING',
                    targetUserId: user.id,
                    performedByUserId: user.id,
                    details: `Admin created offline test booking for Train ${trainNo}.`
                }
            });
        });

        return res.json({ success: true, message: 'Offline Test Booking Created Successfully' });
    } catch (error: any) {
        console.error('Offline payment error:', error);
        return res.status(500).json({ error: error.message || 'Offline booking failed' });
    }
});

/**
 * POST /api/payments/wallet/create-order
 * Initiates a Razorpay order for wallet top-up.
 */
router.post('/wallet/create-order', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
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
    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        return res.status(500).json({ error: 'Could not create payment order' });
    }
});

/**
 * POST /api/payments/wallet/verify-topup
 * Verifies Razorpay payment signature and credits the user's wallet.
 */
router.post('/wallet/verify-topup', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'CUSTOMER']), async (req, res) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        amount 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification details' });
    }

    try {
        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // 2. Transactionally update user balance and log it
        const result = await prisma.$transaction(async (tx) => {
            // Update User Balance
            const user = await tx.user.update({
                where: { id: req.user!.userId },
                data: { walletBalance: { increment: amount } }
            });

            // Create Wallet Transaction
            await tx.walletTransaction.create({
                data: {
                    userId: req.user!.userId,
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
                    userId: req.user!.userId
                }
            });

            // Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'WALLET_TOPUP',
                    targetUserId: req.user!.userId,
                    performedByUserId: req.user!.userId,
                    details: `Added ₹${amount} via Razorpay. New balance: ₹${user.walletBalance}`
                }
            });

            return user;
        });

        // 3. Notify user (optional, non-blocking)
        try {
            if (result.mobile) {
                await notifyPaymentReceived(result.mobile, amount, razorpay_payment_id);
            }
        } catch (e) { console.error('Notification failed:', e); }

        return res.json({ 
            success: true, 
            message: 'Wallet credited successfully', 
            newBalance: result.walletBalance 
        });
    } catch (error: any) {
        console.error('Wallet top-up verification error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/payments/create-order
 * Initiates a standard Razorpay ticket booking order.
 */
router.post('/create-order', requireAuth, async (req, res) => {
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
    } catch (error: any) {
        console.error('Razorpay booking order creation error:', error);
        return res.status(500).json({ error: 'Failed to initiate booking with payment gateway' });
    }
});

/**
 * POST /api/payments/verify
 * Verifies Razorpay ticket booking payment and creates the Booking record.
 */
router.post('/verify', requireAuth, async (req, res) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        trainNo,
        trainName,
        fromStation,
        toStation,
        journeyDate,
        passengers,
        mobile,
        amount,
        trainClass,
        passengerList
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment signature verification' });
    }

    try {
        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // 2. Transactional Booking Creation
        const result = await prisma.$transaction(async (tx) => {
            // Create Event
            const pDesc = Array.isArray(passengerList) 
                ? passengerList.map((p: any) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Count: ${passengers}`;

            const fullPassengerDesc = `Passengers: ${pDesc}`;

            const eventName = `${trainName || 'Express'} (${trainNo}) - ${fromStation} to ${toStation}`;
            const description = `Razorpay ticket booking. Train: ${trainNo}. Route: ${fromStation} → ${toStation} on ${journeyDate}. ${fullPassengerDesc}. Mobile: ${mobile}. Paid: ₹${amount}`;

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
                    userId: req.user!.userId
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
                    userId: req.user!.userId,
                    eventId: event.id,
                    paymentId: razorpay_payment_id,
                    status: 'CONFIRMED',
                    class: category
                }
            });

            return { booking, eventName };
        });

        // 3. Notify (Non-blocking)
        try {
            const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
            if (user?.email) {
                await notifyBookingConfirmed(user.email, result.eventName, user.mobile || mobile);
            }
        } catch (e) { console.error('Notification log error:', e); }

        return res.json({ success: true, bookingId: result.booking.id });

    } catch (error: any) {
        console.error('Booking verification error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
