import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireActiveUser } from '../middleware/restrict';
import { prisma } from '../prisma';
import { notifyBookingConfirmed } from '../services/notificationService';
import { checkAndApplyCommission } from '../utils/commission';

const router = Router();

// Create a manual booking (Admin/Sales Manager only)
router.post('/', requireAuth, requireActiveUser, async (req, res) => {
    const { 
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


    // Check permissions
    if (!['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    if (!trainNo || !fromStation || !toStation || !journeyDate || !mobile || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Event (Walk-in specific)
            const pDesc = Array.isArray(passengerList) 
                ? passengerList.map((p: any) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Count: ${passengers || 1}`;

            const fullPassengerDesc = `Passengers: ${pDesc}`;

            const event = await tx.event.create({
                data: {
                    name: `${trainName || 'Express'} (${trainNo}) - ${fromStation} to ${toStation}`,
                    description: `Manual booking for ${trainNo} on ${journeyDate} via ${fromStation} to ${toStation}. Class: ${trainClass}. Mobile: ${mobile}. ${fullPassengerDesc}.`,
                    date: new Date(journeyDate),
                }
            });


            // 2. Generate a manual payment ID
            const manualPaymentId = `MOFF_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // 3. Create PaymentRecord
            await tx.paymentRecord.create({
                data: {
                    orderId: `MANUAL_${Date.now()}`,
                    paymentId: manualPaymentId,
                    amount: Number(amount),
                    status: 'CAPTURED',
                    userId: req.user!.userId
                }
            });

            // 4. Create Booking
            const booking = await tx.booking.create({
                data: {
                    userId: req.user!.userId,
                    eventId: event.id,
                    status: 'CONFIRMED',
                    paymentId: manualPaymentId,
                    class: trainClass === 'SLEEPER' ? 'SLEEPER' : 'AC'
                },
                include: {
                    event: true,
                    user: { select: { email: true, mobile: true } }
                }
            });

            await checkAndApplyCommission(tx, req.user!.userId, Number(amount), booking.id, trainNo);

            return booking;
        });

        // Notify (Non-fatal)
        try {
            const targetEmail = email || result.user.email;
            const targetMobile = mobile || result.user.mobile || undefined;
            notifyBookingConfirmed(targetEmail, result.id, targetMobile).catch(err => console.error('Manual booking notification background error:', err));
        } catch (err) {
            console.error('Failed to send manual booking notification:', err);
        }

        return res.status(201).json({ 
            success: true, 
            bookingId: result.id,
            message: 'Manual booking created successfully'
        });

    } catch (error: any) {
        console.error('Manual booking error:', error);
        return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

export default router;
