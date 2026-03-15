import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';
import { notifyBookingCancelled } from '../services/notificationService';
import { refundQueue } from '../queue/refundQueue';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `ticket_${req.params.id}_${Date.now()}.pdf`)
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDFs are allowed.'));
    }
});


// Only Super Admins can assign roles
// Admin or Super Admin can assign roles/register users
router.post('/assign-role', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { email, name, mobile, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ error: 'Missing email or role' });
    }

    // Role restrictions
    if (req.user!.role === 'ADMIN' && role !== 'SALES_MANAGER') {
        return res.status(403).json({ error: 'Admins can only create Sales Managers' });
    }

    // Removed CUSTOMER since customers register via Google Login
    const validRoles = ['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Use upsert to handle both new and existing users
            const user = await tx.user.upsert({
                where: { email },
                update: {
                    role,
                    name: name || undefined,
                    mobile: mobile || undefined,
                    createdByUserId: req.user!.role === 'ADMIN' ? req.user!.userId : undefined
                },
                create: {
                    email,
                    name: name || null,
                    mobile: mobile || null,
                    role,
                    passwordHash: 'PROVISIONED_ACCOUNT', // Placeholder for provisioned accounts
                    createdByUserId: req.user!.role === 'ADMIN' ? req.user!.userId : undefined
                }
            });

            await tx.auditLog.create({
                data: {
                    action: 'ASSIGN_ROLE',
                    targetUserId: user.id,
                    performedByUserId: req.user!.userId,
                    details: `Assigned role ${role} to ${email}`
                }
            });
        });

        return res.json({ success: true, message: `Role ${role} assigned to ${email} successfully` });
    } catch (error: any) {
        console.error('Assign role error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Super Admins can assign regions to Sales Managers
router.post('/assign-region', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { targetUserId, region } = req.body;

    if (!targetUserId || !region) {
        return res.status(400).json({ error: 'Missing targetUserId or region' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: targetUserId } });
            if (!user || user.role !== 'SALES_MANAGER') {
                throw new Error('Target user must be a Sales Manager');
            }

            await tx.user.update({
                where: { id: targetUserId },
                data: { region }
            });

            await tx.auditLog.create({
                data: {
                    action: 'ASSIGN_REGION',
                    targetUserId,
                    performedByUserId: req.user!.userId,
                    details: `Assigned region ${region}`
                }
            });
        });

        return res.json({ success: true, message: `Region ${region} assigned successfully` });
    } catch (error: any) {
        console.error('Assign region error:', error);
        return res.status(400).json({ error: error.message || 'Error occurred' });
    }
});

// Get manual refunds
router.get('/refunds', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const refunds = await prisma.refundRecord.findMany({
            where: { status: 'MANUAL_PENDING' },
            orderBy: { manualCreditDueDate: 'asc' } // The closest due dates first
        });
        return res.json({ refunds });
    } catch (error) {
        console.error('Fetch manual refunds error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin: Get team members (Sales Managers created by this Admin) with stats
router.get('/team', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const { userId } = req.user!;
    try {
        const members = await prisma.user.findMany({
            where: { createdByUserId: userId, role: 'SALES_MANAGER' },
            select: {
                id: true,
                email: true,
                name: true,
                mobile: true,
                region: true,
                createdAt: true,
                _count: {
                    select: { bookings: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ members });
    } catch (error) {
        console.error('Fetch team error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get system stats for dashboard
// Get system stats for dashboard
router.get('/stats', requireAuth, async (req, res) => {
    const { role, userId } = req.user!;

    try {
        if (role === 'SUPER_ADMIN') {
            const [superAdmins, admins, salesMgrs, customers, todayAC, todaySL, totalAC, totalSL] = await Promise.all([
                prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
                prisma.user.count({ where: { role: 'ADMIN' } }),
                prisma.user.count({ where: { role: 'SALES_MANAGER' } }),
                prisma.user.count({ where: { role: 'CUSTOMER' } }),
                // Today's Bookings by class
                prisma.booking.count({
                    where: {
                        class: 'AC',
                        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    }
                }),
                prisma.booking.count({
                    where: {
                        class: 'SLEEPER',
                        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    }
                }),
                // Total Bookings by class
                prisma.booking.count({ where: { class: 'AC' } }),
                prisma.booking.count({ where: { class: 'SLEEPER' } })
            ]);

            return res.json({
                SUPER_ADMIN: superAdmins,
                ADMIN: admins,
                SALES_MANAGER: salesMgrs,
                CUSTOMER: customers,
                todayAC,
                todaySL,
                totalAC,
                totalSL
            });
        }

        if (role === 'ADMIN') {
            const salesMgrCount = await prisma.user.count({ where: { createdByUserId: userId, role: 'SALES_MANAGER' } });
            return res.json({ salesMgrCount });
        }

        if (role === 'SALES_MANAGER') {
            const [todayCount, totalCount] = await Promise.all([
                prisma.booking.count({
                    where: {
                        userId: userId,
                        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    }
                }),
                prisma.booking.count({ where: { userId: userId } })
            ]);
            return res.json({ todayCount, totalCount });
        }

        return res.status(403).json({ error: 'Unauthorized' });
    } catch (error: any) {
        console.error('Fetch stats error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Get sales data for dashboard
router.get('/sales', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    try {
        const queryParams: any = {};

        // If a Sales Manager is retrieving data, only show data for their specific region
        if (req.user!.role === 'SALES_MANAGER') {
            const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
            if (user?.region) {
                // In a production system, PaymentRecords or Bookings would have a region assigned.
                // For this example, if the user is a SALES_MANAGER, we just fetch their specific transactions based on logic
                // Since our models (Booking/PaymentRecord) don't have region natively mapped yet except inside RefundRecord,
                // we'll fetch all data globally for Admin/SuperAdmin, and mock it for SalesMgrs.
            }
        }

        const [payments, recentBookings] = await Promise.all([
            prisma.paymentRecord.findMany({
                where: { status: 'CAPTURED' },
                orderBy: { createdAt: 'desc' },
                take: 500 // Get expanded set for revenue calc/charting logic
            }),
            prisma.booking.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: { select: { email: true } },
                    event: { select: { name: true } }
                }
            })
        ]);

        const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

        // Aggregate by day for the chart
        const revenueByDay: Record<string, number> = {};
        payments.forEach(payment => {
            const date = payment.createdAt.toISOString().split('T')[0];
            if (!revenueByDay[date]) revenueByDay[date] = 0;
            revenueByDay[date] += payment.amount;
        });

        const timelineData = Object.entries(revenueByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, amount]) => ({ date, amount }));

        return res.json({
            totalRevenue,
            recentBookings,
            totalSalesCount: payments.length,
            timelineData
        });

    } catch (error: any) {
        console.error('Fetch sales data error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get all bookings
// Get bookings
router.get('/bookings', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user!;
    try {
        let where: any = {};

        if (role === 'ADMIN') {
            // Only see bookings from Sales Managers created by this Admin
            where = {
                user: {
                    createdByUserId: userId,
                    role: 'SALES_MANAGER'
                }
            };
        } else if (role === 'SALES_MANAGER') {
            const scope = req.query.scope as string;

            if (scope === 'team') {
                // Find the admin who created this sales manager
                const currentUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { createdByUserId: true }
                });

                if (currentUser?.createdByUserId) {
                    // See bookings from all Sales Managers created by the same admin
                    where = {
                        user: {
                            createdByUserId: currentUser.createdByUserId,
                            role: 'SALES_MANAGER'
                        }
                    };
                } else {
                    // Fallback to self-only if no creator (unlikely for a sales manager)
                    where = { userId };
                }
            } else {
                // Default: Only see self bookings
                where = { userId };
            }
        }

        const bookings = await prisma.booking.findMany({
            where,
            orderBy: { event: { date: 'asc' } },
            include: {
                user: { select: { email: true } },
                event: { select: { name: true, date: true } },
                refundRecords: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
        return res.json({ bookings });
    } catch (error) {
        console.error('Fetch bookings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get transactions
router.get('/transactions', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user!;
    try {
        let where: any = {};

        if (role === 'ADMIN') {
            where = {
                user: {
                    createdByUserId: userId,
                    role: 'SALES_MANAGER'
                }
            };
        } else if (role === 'SALES_MANAGER') {
            const scope = req.query.scope as string;
            if (scope === 'team') {
                const currentUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { createdByUserId: true }
                });
                if (currentUser?.createdByUserId) {
                    where = {
                        user: {
                            createdByUserId: currentUser.createdByUserId,
                            role: 'SALES_MANAGER'
                        }
                    };
                } else {
                    where = { userId };
                }
            } else {
                where = { userId };
            }
        }

        const transactions = await prisma.paymentRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { email: true } }
            }
        });

        // Enhance with refund info if available
        const enhancedTransactions = await Promise.all(transactions.map(async (payment) => {
            const refund = await prisma.refundRecord.findFirst({
                where: { paymentId: payment.paymentId },
                orderBy: { createdAt: 'desc' }
            });
            const linkedBooking = await prisma.booking.findFirst({
                where: { paymentId: payment.paymentId },
                select: { id: true }
            });

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

        return res.json({ payments: enhancedTransactions });
    } catch (error) {
        console.error('Fetch transactions error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Cancel a booking
router.put('/bookings/:id/cancel', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    try {
        const booking = await prisma.booking.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });

        // Handle Auto Refund if it was paid
        if (booking.paymentId) {
            const paymentRecord = await prisma.paymentRecord.findUnique({ where: { paymentId: booking.paymentId } });

            if (paymentRecord) {
                // Policy: Admin-initiated cancellations currently grant a full refund.
                // If ₹50 fee is required for admin cancellations too, update amount to: Math.max(0, paymentRecord.amount - 50)
                const refund = await prisma.refundRecord.create({
                    data: {
                        paymentId: booking.paymentId,
                        amount: paymentRecord.amount,
                        region: 'Global',
                        reason: 'Admin Override Auto-Cancellation',
                        userId: booking.userId,
                        bookingId: id,
                        status: 'AUTOMATED_PENDING',
                    }
                });

                await refundQueue.add('process-refund', {
                    refundId: refund.id,
                    paymentId: booking.paymentId,
                    amount: paymentRecord.amount
                });
            }
        }

        await prisma.auditLog.create({
            data: {
                action: 'CANCEL_BOOKING',
                performedByUserId: req.user!.userId,
                details: `Booking ${id} was cancelled by Admin.`,
                targetUserId: booking.userId
            }
        });

        // Trigger Notification Webhook
        const targetUser = await prisma.user.findUnique({ where: { id: booking.userId } });
        if (targetUser) {
            await notifyBookingCancelled(targetUser.email, 'Cancelled by Admin');
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

        await prisma.auditLog.create({
            data: {
                action: 'DELETE_BOOKING',
                performedByUserId: req.user!.userId,
                details: `Booking ${id} was permanently deleted by Super Admin.`,
                targetUserId: booking.userId
            }
        });

        return res.json({ success: true, message: 'Booking permanently deleted.' });
    } catch (error) {
        console.error('Delete booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Upload a PDF Ticket
router.post('/bookings/:id/ticket', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), upload.single('ticket'), async (req, res) => {
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
router.put('/bookings/:id/rebook', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
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
router.patch('/bookings/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'SUCCESS', 'CANCELLED', 'CONFIRMED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const booking = await prisma.booking.update({
            where: { id },
            data: { status }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_BOOKING_STATUS',
                performedByUserId: req.user!.userId,
                details: `Booking ${id} status updated to ${status} by Admin.`,
                targetUserId: booking.userId
            }
        });

        return res.json({ success: true, booking });
    } catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── Super Admin: Get all users (grouped data for User Management page) ──────────
router.get('/users', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                email: true,
                name: true,
                mobile: true,
                role: true,
                region: true,
                createdAt: true,
                _count: { select: { bookings: true } }
            }
        });
        return res.json({ success: true, users });
    } catch (error: any) {
        console.error('Fetch all users error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── Super Admin: Change a user's role ────────────────────────────────────────
router.patch('/users/:id/role', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    const role = req.body.role as string;

    const validRoles = ['CUSTOMER', 'SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent Super Admin from demoting themselves
    if (id === req.user!.userId) {
        return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, email: true, role: true }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CHANGE_USER_ROLE',
                performedByUserId: req.user!.userId,
                targetUserId: id,
                details: `Changed role of ${user.email} to ${role}`
            }
        });

        return res.json({ success: true, user });
    } catch (error: any) {
        console.error('Change role error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
