import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { notifyBookingConfirmed } from '../services/notificationService';

const router = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey12345',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_test_secret_67890',
});

router.post('/create-order', requireAuth, async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Missing amount' });

    try {
        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: `rcpt_${Date.now().toString().slice(-8)}_${req.user!.userId.substring(0, 6)}`
        };

        const order = await razorpay.orders.create(options);
        return res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (error: any) {
        console.error('Razorpay create order error:', JSON.stringify(error, null, 2), error);
        return res.status(500).json({ error: 'Failed to create order', details: error });
    }
});

router.post('/verify', requireAuth, async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        eventId,
        amount,
        trainClass,
        // Walk-in booking details to auto-create Event if needed
        trainNo,
        trainName,
        fromStation,
        toStation,
        journeyDate,
        passengers,
        mobile
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification details' });
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_test_secret_67890')
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const existingPayment = await tx.paymentRecord.findUnique({
                where: { paymentId: razorpay_payment_id }
            });
            if (existingPayment) throw new Error('Payment already verified');

            await tx.paymentRecord.create({
                data: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    amount: amount || 0,
                    status: 'CAPTURED',
                    userId: req.user!.userId
                }
            });

            // Determine the Event to link: use existing eventId, or auto-create from train details
            let resolvedEventId = eventId;

            if (!resolvedEventId && trainNo) {
                // Auto-create an Event record from the train journey details
                const journeyDateObj = journeyDate ? new Date(journeyDate) : new Date();
                const eventName = `Train ${trainNo}${trainName ? ' - ' + trainName : ''}: ${fromStation || '?'} → ${toStation || '?'}`;
                const description = `Walk-in booking. Train: ${trainNo}. Journey: ${fromStation} to ${toStation} on ${journeyDateObj.toDateString()}. Passengers: ${passengers || 1}. Mobile: ${mobile || 'N/A'}.`;

                const event = await tx.event.create({
                    data: {
                        name: eventName,
                        description,
                        date: journeyDateObj
                    }
                });
                resolvedEventId = event.id;
            }

            if (!resolvedEventId) {
                throw new Error('No event ID provided and no train details to create one.');
            }

            // Categorize class
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', 'EC'].includes(trainClass || '')) {
                category = 'AC';
            }

            await tx.booking.create({
                data: {
                    userId: req.user!.userId,
                    eventId: resolvedEventId,
                    paymentId: razorpay_payment_id,
                    status: 'CONFIRMED',
                    class: category
                }
            });
        });

        // Trigger notification
        try {
            const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
            if (user && trainNo) {
                const eventName = `Train ${trainNo}: ${fromStation} → ${toStation}`;
                await notifyBookingConfirmed(user.email, eventName);
            }
        } catch (notifErr) {
            console.error('Notification error (non-fatal):', notifErr);
        }

        return res.json({ success: true });
    } catch (error: any) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ error: error.message || 'Verification failed' });
    }
});

export default router;
