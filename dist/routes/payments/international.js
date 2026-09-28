"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const razorpay_1 = __importDefault(require("razorpay"));
const notificationService_1 = require("../../services/notificationService");
const router = (0, express_1.Router)();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});
/**
 * POST /api/payments/skydo-pay
 * Logs an international booking via Skydo manual transfer.
 */
router.post('/skydo-pay', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER', 'SALES_MANAGER']), async (req, res) => {
    const { amount, trainNo, trainName, fromStation, toStation, journeyDate, passengers, mobile, email, trainClass, passengerList } = req.body;
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const pDesc = Array.isArray(passengerList)
                ? passengerList.map((p) => `${p.name} (${p.age}), ${p.gender}`).join('; ')
                : `Passengers: ${passengers}`;
            const eventName = `${trainName || 'Express'} (${trainNo}) - ${fromStation} to ${toStation}`;
            const description = `SKYDO (International) booking. Train: ${trainNo}. Route: ${fromStation} → ${toStation} on ${journeyDate}. Passengers: ${pDesc}. Mobile: ${mobile}. Amount: ₹${amount}`;
            const event = await tx.event.create({
                data: {
                    name: eventName,
                    description,
                    date: new Date(journeyDate),
                }
            });
            const skydoPaymentId = `SKYDO_${Date.now()}`;
            await tx.paymentRecord.create({
                data: {
                    orderId: `ORD_SKYDO_${Date.now()}`,
                    paymentId: skydoPaymentId,
                    amount: Number(amount),
                    status: 'PENDING',
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
                    paymentId: skydoPaymentId,
                    status: 'PENDING',
                    class: category
                }
            });
            return { booking, eventName };
        });
        // Trigger notifications for Skydo payment (non-blocking)
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { email: true, mobile: true }
            });
            const targetEmail = email || user?.email;
            const targetMobile = mobile || user?.mobile || undefined;
            if (targetEmail) {
                const pDesc = Array.isArray(passengerList)
                    ? passengerList.map((p, i) => `0${i + 1} ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('<br/>')
                    : `Passengers: ${passengers}`;
                const emailDetails = {
                    journeyDate: journeyDate ? new Date(journeyDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
                    passengerDetails: pDesc,
                    transactionId: result.booking.paymentId || 'SKYDO_TRANSFER',
                    amount: amount
                };
                // For Skydo, we still send the confirmation email, but status is Pending
                (0, notificationService_1.notifyBookingConfirmed)(targetEmail, result.eventName, targetMobile, emailDetails).catch(err => console.error('Skydo notification background error:', err));
            }
        }
        catch (notifErr) {
            console.error('Skydo notification error:', notifErr);
        }
        return res.json({ success: true, bookingId: result.booking.id, message: 'Skydo booking logged successfully' });
    }
    catch (error) {
        console.error('Skydo payment error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
