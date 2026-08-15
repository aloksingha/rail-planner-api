import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { requireActiveUser } from '../../middleware/restrict';
import { prisma } from '../../prisma';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { checkAndApplyCommission } from '../../utils/commission';
import { isValidIndianMobile } from '../../utils/validation';
import { notifyBookingConfirmed, notifyPaymentReceived } from '../../services/notificationService';
import { createAuditLog } from '../../services/auditService';

const router = Router();
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
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
        email,
        amount,
        trainClass,
        passengerList
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment signature verification' });
    }

    if (!isValidIndianMobile(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
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

            await checkAndApplyCommission(tx, req.user!.userId, Number(amount), booking.id, trainNo);

            return { booking, eventName };
        });

        // 3. Notify (Non-blocking)
        try {
            const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail) {
                const pDesc = Array.isArray(passengerList)
                    ? passengerList.map((p: any, i: number) => `0${i+1} ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('<br/>')
                    : `Passengers: ${passengers}`;
                    
                const emailDetails = {
                    journeyDate: journeyDate ? new Date(journeyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
                    passengerDetails: pDesc,
                    transactionId: result.booking.paymentId || razorpay_payment_id,
                    amount: amount
                };
                
                notifyBookingConfirmed(targetEmail, result.eventName, targetMobile, emailDetails).catch(err => console.error('Verify notification background error:', err));
            }
        } catch (e) { console.error('Notification log error:', e); }

        return res.json({ success: true, bookingId: result.booking.id });

    } catch (error: any) {
        console.error('Booking verification error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
