import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
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

router.post('/wallet-pay', requireAuth, requireActiveUser, async (req, res) => {
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
        mobile
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

            // 4. Resolve Event
            let resolvedEventId = eventId;
            if (!resolvedEventId && trainNo) {
                const journeyDateObj = journeyDate ? new Date(journeyDate) : new Date();
                const eventName = `Train ${trainNo}${trainName ? ' - ' + trainName : ''}: ${fromStation || '?'} → ${toStation || '?'}`;
                const description = `Wallet booking. Train: ${trainNo}. Journey: ${fromStation} to ${toStation} on ${journeyDateObj.toDateString()}. Passengers: ${passengers || 1}. Mobile: ${mobile || 'N/A'}.`;

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

export default router;
