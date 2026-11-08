"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const razorpay_1 = __importDefault(require("razorpay"));
const commission_1 = require("../../utils/commission");
const validation_1 = require("../../utils/validation");
const notificationService_1 = require("../../services/notificationService");
const router = (0, express_1.Router)();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});
/**
 * POST /api/payments/offline-pay
 * Creates a booking without actual payment gateway (for Admin Testing & Manual Offline bookings).
 */
router.post('/offline-pay', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { amount, trainNo, trainName, fromStation, toStation, journeyDate, passengers, mobile, email, trainClass, passengerList } = req.body;
    // Sanitize mobile: extract 10 digits (strips +91, spaces, dashes)
    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!(0, validation_1.isValidIndianMobile)(cleanMobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    // Safely parse journey date
    const parsedDate = journeyDate ? new Date(journeyDate) : new Date();
    const validJourneyDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const finalAmount = Number(amount) >= 0 ? Number(amount) : 0;
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Passengers: ${passengers || 1}`;
            const eventName = `${trainName || 'Express'} (${trainNo || 'Special'}) - ${fromStation} to ${toStation}`;
            const description = `OFFLINE/ADMIN booking. Train: ${trainNo}. Route: ${fromStation} → ${toStation} on ${validJourneyDate.toISOString().split('T')[0]}. Passengers: ${pDesc}. Mobile: ${cleanMobile}. Amount: ₹${finalAmount}`;
            const event = await tx.event.create({
                data: {
                    name: eventName,
                    description,
                    date: validJourneyDate,
                }
            });
            const offlinePaymentId = `OFF_${Date.now()}`;
            await tx.paymentRecord.create({
                data: {
                    orderId: `ORD_OFF_${Date.now()}`,
                    paymentId: offlinePaymentId,
                    amount: finalAmount,
                    status: 'CAPTURED',
                    userId: req.user.userId
                }
            });
            let category = 'SLEEPER';
            if (['2A', '3A', 'CC', '1A', '3E', 'FC', 'EC'].includes(String(trainClass || '').toUpperCase())) {
                category = 'AC';
            }
            const booking = await tx.booking.create({
                data: {
                    userId: req.user.userId,
                    eventId: event.id,
                    paymentId: offlinePaymentId,
                    status: 'CONFIRMED',
                    class: category
                }
            });
            try {
                await (0, commission_1.checkAndApplyCommission)(tx, req.user.userId, finalAmount, booking.id, trainNo);
            }
            catch (commErr) {
                console.warn('[OfflinePay] Commission application skipped/failed:', commErr);
            }
            return { booking, eventName };
        });
        // Trigger notifications for offline payment (non-blocking)
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { email: true, mobile: true }
            });
            const targetEmail = email || user?.email;
            const targetMobile = cleanMobile || user?.mobile || undefined;
            if (targetEmail) {
                const pDesc = Array.isArray(passengerList)
                    ? passengerList.map((p, i) => `0${i + 1} ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('<br/>')
                    : `Passengers: ${passengers || 1}`;
                const emailDetails = {
                    journeyDate: validJourneyDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                    passengerDetails: pDesc,
                    transactionId: result.booking.paymentId || 'OFFLINE',
                    amount: finalAmount,
                    trainClass: trainClass
                };
                (0, notificationService_1.notifyBookingConfirmed)(targetEmail, result.eventName, targetMobile, emailDetails).catch(err => console.error('Offline notification background error:', err));
            }
        }
        catch (notifErr) {
            console.error('Offline notification error:', notifErr);
        }
        return res.json({ success: true, bookingId: result.booking.id });
    }
    catch (error) {
        console.error('Offline payment error:', error);
        return res.status(500).json({ error: error?.message || 'Internal Server Error' });
    }
});
exports.default = router;
