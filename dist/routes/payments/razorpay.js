"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const commission_1 = require("../../utils/commission");
const validation_1 = require("../../utils/validation");
const notificationService_1 = require("../../services/notificationService");
const coupons_1 = require("../coupons");
const router = (0, express_1.Router)();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});
/**
 * POST /api/payments/create-order
 * Initiates a standard Razorpay ticket booking order.
 */
router.post('/create-order', auth_1.requireAuth, async (req, res) => {
    const { amount, passengers, passengerList, trainNo } = req.body;
    const numAmount = Number(amount);
    if (!isFinite(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid booking amount' });
    }
    const paxCount = Array.isArray(passengerList) && passengerList.length > 0
        ? passengerList.length
        : (Number(passengers) || 1);
    const minFarePerPax = 100;
    if (trainNo && numAmount < paxCount * minFarePerPax) {
        return res.status(400).json({
            error: `Order amount (₹${numAmount}) is below minimum plausible train fare for ${paxCount} passenger(s). Minimum is ₹${paxCount * minFarePerPax}.`
        });
    }
    try {
        const options = {
            amount: Math.round(numAmount * 100), // to paise
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
        // 1. Timing-safe Signature Verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        const sigBuffer = Buffer.from(razorpay_signature, 'utf8');
        const expBuffer = Buffer.from(expectedSignature, 'utf8');
        if (sigBuffer.length !== expBuffer.length || !crypto_1.default.timingSafeEqual(sigBuffer, expBuffer)) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        // 2. Fetch and strictly verify payment details from Razorpay Gateway (Prevents Amount Tampering)
        let verifiedAmount = Number(amount);
        try {
            const payment = await razorpay.payments.fetch(razorpay_payment_id);
            if (!payment) {
                return res.status(400).json({ error: 'Payment details could not be retrieved from gateway' });
            }
            if (payment.order_id && payment.order_id !== razorpay_order_id) {
                return res.status(400).json({ error: 'Order ID mismatch between signature and gateway' });
            }
            if (payment.status !== 'captured' && payment.status !== 'authorized') {
                return res.status(400).json({ error: `Payment is not in captured status. Current status: ${payment.status}` });
            }
            const gatewayAmountRupees = Math.round(Number(payment.amount) / 100);
            if (gatewayAmountRupees <= 0) {
                return res.status(400).json({ error: 'Invalid payment amount reported by gateway' });
            }
            if (amount && Math.abs(gatewayAmountRupees - Number(amount)) > 1) {
                return res.status(400).json({ error: 'Payment amount mismatch between gateway and client payload' });
            }
            verifiedAmount = gatewayAmountRupees;
        }
        catch (fetchErr) {
            console.error('[Razorpay Booking Verify] Gateway verification error:', fetchErr.message || fetchErr);
            return res.status(502).json({ error: 'Failed to verify transaction with payment gateway. Please contact support.' });
        }
        // 3. Transactional Booking Creation with VERIFIED amount
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Create Event
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Passengers: ${passengers}`;
            const eventName = `${trainName || 'Express'} (${trainNo}) - ${fromStation} to ${toStation}`;
            const description = `Razorpay ticket booking. Train: ${trainNo}. Route: ${fromStation} → ${toStation} on ${journeyDate}. Passengers: ${pDesc}. Mobile: ${mobile}. Paid: ₹${verifiedAmount}`;
            const event = await tx.event.create({
                data: {
                    name: eventName,
                    description,
                    date: new Date(journeyDate),
                }
            });
            // Create Payment Record with verified amount
            await tx.paymentRecord.create({
                data: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    amount: verifiedAmount,
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
            const bookingPlatform = String(req.body.platform || req.headers['x-client-platform'] || (req.headers['user-agent']?.includes('Capacitor') ? 'APP' : 'WEB')).toUpperCase() === 'APP' ? 'APP' : 'WEB';
            const booking = await tx.booking.create({
                data: {
                    userId: req.user.userId,
                    eventId: event.id,
                    paymentId: razorpay_payment_id,
                    status: 'CONFIRMED',
                    class: category,
                    platform: bookingPlatform
                }
            });
            await (0, commission_1.checkAndApplyCommission)(tx, req.user.userId, verifiedAmount, booking.id, trainNo);
            await (0, coupons_1.incrementCouponUsage)(tx, req.body.couponCode || req.body.coupon);
            return { booking, eventName };
        });
        // 3. Notify (Non-blocking)
        try {
            const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail) {
                const pDesc = Array.isArray(passengerList)
                    ? passengerList.map((p, i) => `0${i + 1} ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('<br/>')
                    : `Passengers: ${passengers}`;
                const emailDetails = {
                    bookingId: result.booking.id,
                    journeyDate: journeyDate ? new Date(journeyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
                    passengerDetails: pDesc,
                    transactionId: result.booking.paymentId || razorpay_payment_id,
                    amount: amount,
                    trainClass: trainClass
                };
                (0, notificationService_1.notifyBookingConfirmed)(targetEmail, result.eventName, targetMobile, emailDetails).catch(err => console.error('Verify notification background error:', err));
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
exports.default = router;
