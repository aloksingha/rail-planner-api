import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma';
import { notifyBookingConfirmed } from './notifications';

const router = Router();

// Create a manual booking (Admin/Sales Manager only)
router.post('/manual', requireAuth, async (req, res) => {
    const { 
        trainNo, 
        trainName, 
        fromStation, 
        toStation, 
        journeyDate, 
        passengers, 
        mobile, 
        amount, 
        trainClass 
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
            // 1. Create Event if it doesn't exist (Walk-in specific)
            let event = await tx.event.findFirst({
                where: {
                    trainNo: trainNo,
                    source: fromStation,
                    destination: toStation,
                    date: new Date(journeyDate)
                }
            });

            if (!event) {
                event = await tx.event.create({
                    data: {
                        name: `${trainName || 'Express'} (${trainNo})`,
                        trainNo,
                        source: fromStation,
                        destination: toStation,
                        date: new Date(journeyDate),
                        itinerary: `Manual booking for ${trainNo}`,
                        priceSleeper: trainClass === 'SLEEPER' ? Number(amount) : 0,
                        priceAC: (trainClass === 'AC' || trainClass === '3A' || trainClass === '2A') ? Number(amount) : 0,
                    }
                });
            }

            // 2. Create Booking
            const booking = await tx.booking.create({
                data: {
                    userId: req.user!.userId, // The Sales Manager/Admin who created it
                    eventId: event.id,
                    status: 'CONFIRMED', // Immediately confirmed
                    passengers: Number(passengers),
                    totalPaid: Number(amount)
                },
                include: {
                    event: true,
                    user: { select: { email: true } }
                }
            });

            // 3. Create Transaction RECORD (Internal only, no Razorpay ID)
            await tx.transaction.create({
                data: {
                    bookingId: booking.id,
                    amount: Number(amount),
                    currency: 'INR',
                    status: 'SUCCESS',
                    paymentMethod: 'CASH_OFFLINE', // New payment method indicator
                    razorpayOrderId: `MANUAL_${Date.now()}`
                }
            });

            return booking;
        });

        // Notify (Non-fatal)
        try {
            await notifyBookingConfirmed(result.id);
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
