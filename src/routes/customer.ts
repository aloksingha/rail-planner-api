import express from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../prisma';
import { notifyBookingCancelled, notifyBookingConfirmed } from '../services/notificationService';
import { refundQueue } from '../queue/refundQueue';

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.userId;

        const [bookings, paymentsRaw, user] = await Promise.all([
            prisma.booking.findMany({
                where: { userId },
                include: { event: true },
                orderBy: { event: { date: 'asc' } },
                take: 20
            }),
            prisma.paymentRecord.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, role: true }
            })
        ]);

        const payments = await Promise.all(paymentsRaw.map(async (payment) => {
            const [linkedBooking, refund] = await Promise.all([
                prisma.booking.findFirst({
                    where: { paymentId: payment.paymentId },
                    select: { id: true }
                }),
                prisma.refundRecord.findFirst({
                    where: { paymentId: payment.paymentId },
                    orderBy: { createdAt: 'desc' }
                })
            ]);
            return {
                ...payment,
                bookingId: linkedBooking?.id || null,
                refundInfo: refund ? {
                    status: refund.status,
                    razorpayRefundId: refund.razorpayRefundId,
                    updatedAt: refund.updatedAt
                } : null
            };
        }));

        return res.json({
            user,
            bookings,
            payments
        });

    } catch (error: any) {
        console.error('Fetch customer dashboard error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Customer Re-book (Change Date)
router.put('/bookings/:id/rebook', requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const userId = req.user!.userId;
    const { newDate } = req.body;

    if (!newDate) return res.status(400).json({ error: 'New date is required.' });

    try {
        const booking = await prisma.booking.findFirst({
            where: { id, userId },
            include: { event: true }
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found.' });

        // Create a new event with the new date but same name/description template
        const newEvent = await prisma.event.create({
            data: {
                name: booking.event.name,
                description: booking.event.description.replace(/on .* Passengers/, `on ${new Date(newDate).toDateString()}. Passengers`),
                date: new Date(newDate)
            }
        });

        await prisma.booking.update({
            where: { id },
            data: { eventId: newEvent.id }
        });

        return res.json({ success: true, newEvent });
    } catch (error) {
        console.error('Customer re-booking error:', error);
        return res.status(500).json({ error: 'Failed to re-book.' });
    }
});

// Customer Cancel Booking
router.put('/bookings/:id/cancel', requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    try {
        const booking = await prisma.booking.findFirst({
            where: { id, userId },
            include: { user: true }
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found.' });
        if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Already cancelled.' });

        await prisma.booking.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });

        // Handle Auto Refund if it was paid
        if (booking.paymentId) {
            const paymentRecord = await prisma.paymentRecord.findUnique({ where: { paymentId: booking.paymentId } });

            if (paymentRecord) {
                const cancellationFee = 50;
                const refundAmount = Math.max(0, paymentRecord.amount - cancellationFee);

                const refund = await prisma.refundRecord.create({
                    data: {
                        paymentId: booking.paymentId,
                        amount: refundAmount,
                        region: 'Global',
                        reason: `Cancelled by Customer (₹${cancellationFee} fee deducted)`,
                        userId: userId,
                        bookingId: id,
                        status: 'AUTOMATED_PENDING',
                    }
                });

                await refundQueue.add('process-refund', {
                    refundId: refund.id,
                    paymentId: booking.paymentId,
                    amount: refundAmount
                });
            }
        }

        // Trigger Notification
        if (booking.user?.email) {
            await notifyBookingCancelled(booking.user.email, 'Cancelled by You');
        }

        return res.json({ success: true, message: 'Booking cancelled and refund initiated.' });
    } catch (error) {
        console.error('Customer cancellation error:', error);
        return res.status(500).json({ error: 'Failed to cancel booking.' });
    }
});

export default router;
