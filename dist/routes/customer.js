"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const notificationService_1 = require("../services/notificationService");
const refundQueue_1 = require("../queue/refundQueue");
const razorpayService_1 = require("../services/razorpayService");
const cancellation_1 = require("../utils/cancellation");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
router.get('/dashboard', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [bookings, paymentsRaw, user] = await Promise.all([
            prisma_1.prisma.booking.findMany({
                where: { userId },
                include: {
                    event: true,
                    refundRecords: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { event: { date: 'asc' } },
                take: 20
            }),
            prisma_1.prisma.paymentRecord.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, role: true, walletBalance: true }
            })
        ]);
        const paymentIdsForPayments = paymentsRaw.map(p => p.paymentId).filter(Boolean);
        const [linkedBookings, refunds] = await Promise.all([
            prisma_1.prisma.booking.findMany({
                where: { paymentId: { in: paymentIdsForPayments } },
                select: { id: true, paymentId: true }
            }),
            prisma_1.prisma.refundRecord.findMany({
                where: { paymentId: { in: paymentIdsForPayments } },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        const linkedBookingMap = new Map();
        for (const booking of linkedBookings) {
            if (booking.paymentId) {
                linkedBookingMap.set(booking.paymentId, booking.id);
            }
        }
        const refundMap = new Map();
        for (const refund of refunds) {
            if (!refundMap.has(refund.paymentId)) {
                refundMap.set(refund.paymentId, refund);
            }
        }
        const payments = paymentsRaw.map((payment) => {
            const bookingId = linkedBookingMap.get(payment.paymentId) || null;
            const refund = refundMap.get(payment.paymentId);
            return {
                ...payment,
                bookingId,
                refundInfo: refund ? {
                    status: refund.status,
                    razorpayRefundId: refund.razorpayRefundId,
                    updatedAt: refund.updatedAt
                } : null
            };
        });
        // Map PaymentRecord amount to each booking
        const paymentIds = bookings.map(b => b.paymentId).filter(Boolean);
        const bookingPayments = await prisma_1.prisma.paymentRecord.findMany({
            where: { paymentId: { in: paymentIds } },
            select: { paymentId: true, amount: true }
        });
        const paymentMap = new Map(bookingPayments.map(p => [p.paymentId, p.amount]));
        const bookingsWithAmount = bookings.map(b => ({
            ...b,
            amount: b.paymentId ? (paymentMap.get(b.paymentId) || 0) : 0
        }));
        return res.json({
            user,
            bookings: bookingsWithAmount,
            payments
        });
    }
    catch (error) {
        console.error('Fetch customer dashboard error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Get customer stats for dashboard counters
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [totalBookings, activeTickets, user] = await Promise.all([
            prisma_1.prisma.booking.count({ where: { userId } }),
            prisma_1.prisma.booking.count({ where: { userId, status: 'CONFIRMED' } }),
            prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { walletBalance: true }
            })
        ]);
        return res.json({
            totalBookings,
            activeTickets,
            balance: user?.walletBalance || 0
        });
    }
    catch (error) {
        console.error('Fetch customer stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Customer Re-book (Change Date)
// Customer Re-book (Change Date & Train)
router.put('/bookings/:id/rebook', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const { newDate, newTrainNo, newTrainName, newClass, amount: newPrice, paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!newDate || !newTrainNo || !newClass || newPrice === undefined) {
        return res.status(400).json({ error: 'Missing required rebooking parameters.' });
    }
    try {
        const booking = await prisma_1.prisma.booking.findFirst({
            where: { id, userId },
            include: { event: true }
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found.' });
        // Get old price from payment record
        const oldPayment = await prisma_1.prisma.paymentRecord.findUnique({
            where: { paymentId: booking.paymentId || '' }
        });
        if (!oldPayment)
            return res.status(400).json({ error: 'Original payment record not found.' });
        const oldPrice = oldPayment.amount;
        const diff = newPrice - oldPrice;
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Handle Payment Difference
            if (diff > 0) {
                if (paymentMethod === 'RAZORPAY') {
                    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
                        throw new Error('Missing Razorpay parameters for additional payment');
                    }
                    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
                    const expectedSignature = crypto_1.default.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                        .update(text)
                        .digest('hex');
                    if (expectedSignature !== razorpay_signature) {
                        throw new Error('Invalid Razorpay signature');
                    }
                    // Log the additional payment
                    await tx.walletTransaction.create({
                        data: {
                            userId,
                            amount: diff,
                            type: 'CREDIT', // Technically direct pay, but log as credit+debit for simplicity or just audit log
                            description: `Rebook extra payment (Txn: ${razorpay_payment_id})`
                        }
                    });
                }
                else if (paymentMethod === 'WALLET') {
                    const user = await tx.user.findUnique({ where: { id: userId } });
                    if (!user || user.walletBalance < diff) {
                        throw new Error('Insufficient wallet balance for rebooking diff');
                    }
                    await tx.user.update({
                        where: { id: userId },
                        data: { walletBalance: { decrement: diff } }
                    });
                    await tx.walletTransaction.create({
                        data: {
                            userId,
                            amount: diff,
                            type: 'DEBIT',
                            description: `Rebook extra charge for Booking ${id}`
                        }
                    });
                }
                else {
                    throw new Error('Invalid payment method');
                }
            }
            else if (diff < 0) {
                // Refund the difference to wallet
                const refundAmount = Math.abs(diff);
                await tx.user.update({
                    where: { id: userId },
                    data: { walletBalance: { increment: refundAmount } }
                });
                await tx.walletTransaction.create({
                    data: {
                        userId,
                        amount: refundAmount,
                        type: 'CREDIT',
                        description: `Rebook refund for Booking ${id}`
                    }
                });
            }
            // 2. Extract passenger info and create new event
            let originalPassengers = '';
            const paxMatch = booking.event.description.match(/Passengers:\s*(.*?)(?=\.\s*Mobile:|$)/);
            if (paxMatch)
                originalPassengers = paxMatch[1];
            const originalMobileMatch = booking.event.description.match(/Mobile:\s*(\d+)/);
            const originalMobile = originalMobileMatch ? originalMobileMatch[1] : '';
            const newEventName = `Train ${newTrainNo} - ${newTrainName}`;
            const newDescription = `OFFLINE/ADMIN booking. Train: ${newTrainNo}. Route: ${newEventName} on ${new Date(newDate).toDateString()}. Passengers: ${originalPassengers}. Mobile: ${originalMobile}. Amount: ₹${newPrice}`;
            const newEvent = await tx.event.create({
                data: {
                    name: newEventName,
                    description: newDescription,
                    date: new Date(newDate)
                }
            });
            // 3. Update Booking
            await tx.booking.update({
                where: { id },
                data: {
                    eventId: newEvent.id,
                    class: newClass,
                    status: 'CONFIRMED' // Or pending based on rules, but keeping it CONFIRMED if it was success
                }
            });
            // Update old PaymentRecord amount so future rebooks see the new total
            await tx.paymentRecord.update({
                where: { paymentId: booking.paymentId || '' },
                data: { amount: newPrice }
            });
            // 4. Audit Log
            await tx.auditLog.create({
                data: {
                    action: 'REBOOK_TICKET',
                    targetUserId: userId,
                    performedByUserId: userId,
                    details: `Rebooked ticket ${id} to Train ${newTrainNo} on ${newDate}. Diff: ₹${diff}`
                }
            });
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Customer re-booking error:', error);
        return res.status(500).json({ error: error.message || 'Failed to re-book.' });
    }
});
// Customer Cancel Booking
router.put('/bookings/:id/cancel', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    try {
        const booking = await prisma_1.prisma.booking.findFirst({
            where: { id },
            include: {
                user: { select: { email: true, mobile: true, role: true, createdByUserId: true } }
            }
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found.' });
        if (booking.status === 'CANCELLED')
            return res.status(400).json({ error: 'Already cancelled.' });
        // Authorization check: owner, admin, or creator Sales Manager
        const isOwner = booking.userId === userId;
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
        const isSalesCreator = req.user.role === 'SALES_MANAGER' && booking.user.createdByUserId === userId;
        if (!isOwner && !isAdmin && !isSalesCreator) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to cancel this booking.' });
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            return await (0, cancellation_1.cancelPassengersOrBooking)(tx, id);
        });
        if (result.refund) {
            await refundQueue_1.refundQueue.add('process-refund', {
                refundId: result.refund.id,
                paymentId: booking.paymentId,
                amount: result.refund.amount
            });
            // Trigger background processing asynchronously
            (0, razorpayService_1.processTicketRefund)(result.refund.id).catch((err) => {
                console.error(`[Background Refund] Auto-refund failed for request ${result.refund.id}:`, err);
            });
        }
        // Trigger Notification
        if (booking.user?.email) {
            await (0, notificationService_1.notifyBookingCancelled)(booking.user.email, 'Cancelled Entire Ticket', booking.user.mobile || undefined);
        }
        return res.json({ success: true, message: 'Booking cancelled and refund initiated.', refundAmount: result.refundAmount });
    }
    catch (error) {
        console.error('Customer cancellation error:', error);
        return res.status(500).json({ error: error.message || 'Failed to cancel booking.' });
    }
});
// Customer Cancel Specific Passenger
router.post('/bookings/:id/cancel-passenger', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const { passengerName } = req.body;
    if (!passengerName) {
        return res.status(400).json({ error: 'Passenger name is required.' });
    }
    try {
        const booking = await prisma_1.prisma.booking.findFirst({
            where: { id },
            include: {
                user: { select: { email: true, mobile: true, role: true, createdByUserId: true } }
            }
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found.' });
        if (booking.status === 'CANCELLED')
            return res.status(400).json({ error: 'Booking is already cancelled.' });
        // Authorization check: owner, admin, or creator Sales Manager
        const isOwner = booking.userId === userId;
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
        const isSalesCreator = req.user.role === 'SALES_MANAGER' && booking.user.createdByUserId === userId;
        if (!isOwner && !isAdmin && !isSalesCreator) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this booking.' });
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            return await (0, cancellation_1.cancelPassengersOrBooking)(tx, id, passengerName);
        });
        if (result.refund) {
            await refundQueue_1.refundQueue.add('process-refund', {
                refundId: result.refund.id,
                paymentId: booking.paymentId,
                amount: result.refund.amount
            });
            // Trigger background processing asynchronously
            (0, razorpayService_1.processTicketRefund)(result.refund.id).catch((err) => {
                console.error(`[Background Refund] Auto-refund failed for request ${result.refund.id}:`, err);
            });
        }
        // Trigger Notification
        if (booking.user?.email) {
            await (0, notificationService_1.notifyBookingCancelled)(booking.user.email, `Passenger Cancelled: ${passengerName}`, booking.user.mobile || undefined);
        }
        return res.json({ success: true, message: `Passenger ${passengerName} cancelled and refund initiated.`, refundAmount: result.refundAmount });
    }
    catch (error) {
        console.error('Passenger cancellation error:', error);
        return res.status(500).json({ error: error.message || 'Failed to cancel passenger ticket.' });
    }
});
exports.default = router;
