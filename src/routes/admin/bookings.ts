import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { notifyBookingCancelled, notifyBookingConfirmed } from '../../services/notificationService';
import { createAuditLog } from '../../services/auditService';
import { refundQueue } from '../../queue/refundQueue';
import { processTicketRefund } from '../../services/razorpayService';
import { cancelPassengersOrBooking } from '../../utils/cancellation';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `ticket_${req.params.id}_${Date.now()}.pdf`)
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDFs are allowed.'));
    }
});

// Get all bookings
// Cancel a booking
router.put('/bookings/:id/cancel', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'GLOBAL_BOOKINGS' }), async (req, res) => {
    const id = req.params.id as string;
    try {
        const result = await prisma.$transaction(async (tx) => {
            return await cancelPassengersOrBooking(tx, id);
        });

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (result.refund && booking) {
            await refundQueue.add('process-refund', {
                refundId: result.refund.id,
                paymentId: booking.paymentId,
                amount: result.refund.amount
            });

            // Trigger background processing asynchronously
            processTicketRefund(result.refund.id).catch((err) => {
                console.error(`[Background Refund] Auto-refund failed for request ${result.refund.id}:`, err);
            });
        }

        await createAuditLog({
            action: 'CANCEL_BOOKING',
            performedByUserId: req.user!.userId,
            details: `Booking ${id} was cancelled by Admin.`,
            targetUserId: booking.userId
        });

        // Trigger Notification Webhook
        const targetUser = await prisma.user.findUnique({ 
            where: { id: booking.userId },
            select: { email: true, mobile: true }
        });
        if (targetUser) {
            await notifyBookingCancelled(targetUser.email, 'Cancelled by Admin', targetUser.mobile || undefined);
        }

        return res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Hard Delete a booking (Super Admin Only)
router.delete('/bookings/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id as string;

    try {
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Clean up ticket file if it exists
        if (booking.ticketUrl) {
            const filename = path.basename(booking.ticketUrl);
            const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await prisma.booking.delete({ where: { id } });

        await createAuditLog({
            action: 'DELETE_BOOKING',
            performedByUserId: req.user!.userId,
            details: `Booking ${id} was permanently deleted by Super Admin.`,
            targetUserId: booking.userId
        });

        return res.json({ success: true, message: 'Booking permanently deleted.' });
    } catch (error) {
        console.error('Delete booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Upload a PDF Ticket
router.post('/bookings/:id/ticket', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'GLOBAL_BOOKINGS' }), upload.single('ticket'), async (req, res) => {
    const id = req.params.id as string;

    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    try {
        const ticketPath = `/uploads/${req.file.filename}`;

        await prisma.booking.update({
            where: { id },
            data: {
                ticketUrl: ticketPath,
                status: 'CONFIRMED'
            }
        });

        return res.json({ success: true, ticketUrl: ticketPath });
    } catch (error) {
        console.error('Ticket upload error:', error);
        return res.status(500).json({ error: 'Failed to save ticket URL.' });
    }
});

// Delete a PDF Ticket
router.delete('/bookings/:id/ticket', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id as string;

    try {
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking || !booking.ticketUrl) {
            return res.status(404).json({ error: 'Ticket not found or already deleted.' });
        }

        const filename = path.basename(booking.ticketUrl);
        const filePath = path.join(__dirname, '..', '..', 'uploads', filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await prisma.booking.update({
            where: { id },
            data: { ticketUrl: null }
        });

        return res.json({ success: true, message: 'Ticket deleted successfully.' });
    } catch (error) {
        console.error('Ticket deletion error:', error);
        return res.status(500).json({ error: 'Failed to delete ticket.' });
    }
});

// Re-book a booking (Change Date)
router.put('/bookings/:id/rebook', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'GLOBAL_BOOKINGS' }), async (req, res) => {
    const id = req.params.id as string;
    const { newDate } = req.body;

    if (!newDate) return res.status(400).json({ error: 'New date is required.' });

    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
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
        console.error('Re-booking error:', error);
        return res.status(500).json({ error: 'Failed to re-book.' });
    }
});

// Update booking status manually (Success/Pending/Cancelled)
router.patch('/bookings/:id/status', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'GLOBAL_BOOKINGS' }), async (req, res) => {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'SUCCESS', 'CANCELLED', 'CONFIRMED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const booking = await prisma.$transaction(async (tx) => {
            if (status === 'CANCELLED') {
                const cancelRes = await cancelPassengersOrBooking(tx, id);
                if (cancelRes.refund) {
                    await refundQueue.add('process-refund', {
                        refundId: cancelRes.refund.id,
                        paymentId: cancelRes.refund.paymentId,
                        amount: cancelRes.refund.amount
                    });
                    processTicketRefund(cancelRes.refund.id).catch((err) => {
                        console.error(`[Background Refund] Auto-refund failed for request ${cancelRes.refund.id}:`, err);
                    });
                }
                return await tx.booking.findUnique({ where: { id } });
            }

            const updatedBooking = await tx.booking.update({
                where: { id },
                data: { status }
            });

            return updatedBooking;
        });

        await createAuditLog({
            action: 'UPDATE_BOOKING_STATUS',
            performedByUserId: req.user!.userId,
            details: `Booking ${id} status updated to ${status} by Admin.`,
            targetUserId: booking.userId
        });

        // Trigger Notification if status becomes CONFIRMED
        if (status === 'CONFIRMED') {
            const user = await prisma.user.findUnique({ 
                where: { id: booking.userId },
                select: { email: true, mobile: true }
            });
            const event = await prisma.event.findUnique({ where: { id: booking.eventId } });
            if (user && event) {
                notifyBookingConfirmed(user.email, event.name, user.mobile || undefined).catch(err => console.error('Admin status update notification background error:', err));
            }
        }

        return res.json({ success: true, booking });
    } catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});






export default router;
