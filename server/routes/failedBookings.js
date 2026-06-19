"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Publicly accessible to record a failure (no auth required to capture leads)
router.post('/', async (req, res) => {
    const { name, email, mobile, trainName, trainNumber, source, destination, journeyDate, trainClass, reason } = req.body;
    if (!name || !email || !mobile) {
        return res.status(400).json({ error: 'Name, Email, and Mobile are required' });
    }
    if (!(0, validation_1.isValidIndianMobile)(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    try {
        // Deduplication: Check if a similar failure was recorded in the last 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const existing = await prisma_1.prisma.failedBooking.findFirst({
            where: {
                mobile,
                trainNumber,
                journeyDate,
                createdAt: { gte: fifteenMinutesAgo }
            }
        });
        if (existing) {
            console.log(`[FailedBooking] Updating existing record ${existing.id} instead of creating duplicate.`);
            const updated = await prisma_1.prisma.failedBooking.update({
                where: { id: existing.id },
                data: {
                    reason: reason || existing.reason, // Use new reason if provided
                    updatedAt: new Date()
                }
            });
            return res.json({ success: true, id: updated.id, updated: true });
        }
        const failedBooking = await prisma_1.prisma.failedBooking.create({
            data: {
                name,
                email,
                mobile,
                trainName,
                trainNumber,
                source,
                destination,
                journeyDate,
                class: trainClass,
                reason
            }
        });
        return res.json({ success: true, id: failedBooking.id });
    }
    catch (error) {
        console.error('Record failed booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Admin Only: Get all failed bookings
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    try {
        const failedBookings = await prisma_1.prisma.failedBooking.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, failedBookings });
    }
    catch (error) {
        console.error('Fetch failed bookings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Admin Only: Update status
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'FOLLOWED_UP', 'IGNORED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        await prisma_1.prisma.failedBooking.update({
            where: { id: id },
            data: { status }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Update failed booking status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Admin Only: Delete
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.prisma.failedBooking.delete({ where: { id: id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Delete failed booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
