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
 * POST /api/payments/offline-pay
 * Creates a booking without actual payment gateway (for Admin Testing).
 */
router.post('/offline-pay', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const {
        amount,
        trainNo,
        trainName,
        fromStation,
        toStation,
        journeyDate,
        passengers,
        mobile,
        email,
        trainClass,
        passengerList
    } = req.body;

    if (!isValidIndianMobile(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p: any) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
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
                    userId: req.user!.userId
                }
            });

            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(String(trainClass || '').toUpperCase())) {
                category = 'AC';
            }

            const booking = await tx.booking.create({
                data: {
                    userId: req.user!.userId,
                    eventId: event.id,
                    paymentId: offlinePaymentId,
                    status: 'CONFIRMED',
                    class: category
                }
            });

            await checkAndApplyCommission(tx, req.user!.userId, Number(amount), booking.id, trainNo);

            return { booking, eventName };
        });

        // Trigger notifications for offline payment (non-blocking)
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { email: true, mobile: true }
            });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail) {
                const pDesc = Array.isArray(passengerList)
                    ? passengerList.map((p: any, i: number) => `0${i+1} ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('<br/>')
                    : `Passengers: ${passengers}`;
                    
                const emailDetails = {
                    journeyDate: journeyDate ? new Date(journeyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
                    passengerDetails: pDesc,
                    transactionId: result.booking.paymentId || 'OFFLINE',
                    amount: amount
                };

                notifyBookingConfirmed(targetEmail, result.eventName, targetMobile, emailDetails).catch(err => console.error('Offline notification background error:', err));
            }
        } catch (notifErr) {
            console.error('Offline notification error:', notifErr);
        }

        return res.json({ success: true, bookingId: result.booking.id });
    } catch (error: any) {
        console.error('Offline payment error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
export default router;
