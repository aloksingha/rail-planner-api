"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const validation_1 = require("../utils/validation");
const notificationService_1 = require("../services/notificationService");
const auditService_1 = require("../services/auditService");
const refundQueue_1 = require("../queue/refundQueue");
const razorpayService_1 = require("../services/razorpayService");
const multer_1 = __importDefault(require("multer"));
const cancellation_1 = require("../utils/cancellation");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Configure multer for PDF uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, path_1.default.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `ticket_${req.params.id}_${Date.now()}.pdf`)
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf')
            cb(null, true);
        else
            cb(new Error('Only PDFs are allowed.'));
    }
});
// Only Super Admins can assign roles
// Admin or Super Admin can assign roles/register users
router.post('/assign-role', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { email, name, mobile, role } = req.body;
    if (!email || !role) {
        return res.status(400).json({ error: 'Missing email or role' });
    }
    if (mobile && !(0, validation_1.isValidIndianMobile)(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }
    // Role restrictions
    if (req.user.role === 'ADMIN' && role !== 'SALES_MANAGER') {
        return res.status(403).json({ error: 'Admins can only create Sales Managers' });
    }
    // Removed CUSTOMER since customers register via Google Login
    const validRoles = ['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    try {
        await prisma_1.prisma.$transaction(async (tx) => {
            // Use upsert to handle both new and existing users
            const user = await tx.user.upsert({
                where: { email },
                update: {
                    role,
                    name: name || undefined,
                    mobile: mobile || undefined,
                    createdByUserId: req.user.role === 'ADMIN' ? req.user.userId : undefined
                },
                create: {
                    email,
                    name: name || null,
                    mobile: mobile || null,
                    role,
                    passwordHash: 'PROVISIONED_ACCOUNT', // Placeholder for provisioned accounts
                    createdByUserId: req.user.role === 'ADMIN' ? req.user.userId : undefined
                }
            });
            await (0, auditService_1.createAuditLog)({
                action: 'ASSIGN_ROLE',
                targetUserId: user.id,
                performedByUserId: req.user.userId,
                details: `Assigned role ${role} to ${email}`
            });
        });
        return res.json({ success: true, message: `Role ${role} assigned to ${email} successfully` });
    }
    catch (error) {
        console.error('Assign role error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Super Admins can assign regions to Sales Managers
router.post('/assign-region', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { targetUserId, region } = req.body;
    if (!targetUserId || !region) {
        return res.status(400).json({ error: 'Missing targetUserId or region' });
    }
    try {
        await prisma_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: targetUserId } });
            if (!user || user.role !== 'SALES_MANAGER') {
                throw new Error('Target user must be a Sales Manager');
            }
            await tx.user.update({
                where: { id: targetUserId },
                data: { region }
            });
            await (0, auditService_1.createAuditLog)({
                action: 'ASSIGN_REGION',
                targetUserId,
                performedByUserId: req.user.userId,
                details: `Assigned region ${region}`
            });
        });
        return res.json({ success: true, message: `Region ${region} assigned successfully` });
    }
    catch (error) {
        console.error('Assign region error:', error);
        return res.status(400).json({ error: error.message || 'Error occurred' });
    }
});
// Get manual refunds
router.get('/refunds', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const refunds = await prisma_1.prisma.refundRecord.findMany({
            where: { status: 'MANUAL_PENDING' },
            orderBy: { manualCreditDueDate: 'asc' }
        });
        return res.json({ refunds });
    }
    catch (error) {
        console.error('Fetch manual refunds error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Mark manual refund as resolved
router.post('/refunds/:id/resolve', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        const refund = await prisma_1.prisma.refundRecord.update({
            where: { id },
            data: { status: 'MANUAL_RESOLVED' }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'RESOLVE_MANUAL_REFUND',
            performedByUserId: req.user.userId,
            details: `Resolved manual refund for payment ${refund.paymentId}`,
            targetUserId: refund.userId
        });
        return res.json({ success: true, message: 'Refund marked as resolved.' });
    }
    catch (error) {
        console.error('Resolve manual refund error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Admin: Get team members (Sales Managers created by this Admin) with stats
router.get('/team', auth_1.requireAuth, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { userId } = req.user;
    try {
        const members = await prisma_1.prisma.user.findMany({
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
    }
    catch (error) {
        console.error('Fetch team error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// CACHE for statistics
const statsCache = new Map();
const STATS_CACHE_TTL = 60 * 1000; // 1 minute cache for stats
// Get system stats for dashboard
router.get('/stats', auth_1.requireAuth, async (req, res) => {
    const { role, userId } = req.user;
    // Check cache
    const cacheKey = `${role}-${userId}`;
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
        console.log(`[StatsCache] HIT for ${cacheKey}`);
        return res.json(cached.data);
    }
    try {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
            const userWhere = role === 'ADMIN' ? { createdByUserId: userId, role: 'SALES_MANAGER' } : {};
            const bookingWhere = role === 'ADMIN' ? { user: { createdBy: { createdByUserId: userId, role: 'SALES_MANAGER' } } } : {};
            const paymentWhere = role === 'ADMIN' ? { user: { createdBy: { createdByUserId: userId, role: 'SALES_MANAGER' } } } : {};
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            // 1. Single groupBy query for user role counts
            const roleCounts = await prisma_1.prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true }
            });
            let superAdmins = 0;
            let admins = 0;
            let salesMgrs = 0;
            let customers = 0;
            roleCounts.forEach(group => {
                if (group.role === 'SUPER_ADMIN')
                    superAdmins = group._count._all;
                else if (group.role === 'ADMIN')
                    admins = group._count._all;
                else if (group.role === 'SALES_MANAGER')
                    salesMgrs = group._count._all;
                else if (group.role === 'CUSTOMER')
                    customers = group._count._all;
            });
            // 2. Fetch other stats concurrently
            const isSuperAdmin = role === 'SUPER_ADMIN';
            const [teamMembersCount, todayBookings, totalBookings, todayAmountAgg, failedBookingCount, priceRequestCount] = await Promise.all([
                isSuperAdmin ? Promise.resolve(superAdmins + admins + salesMgrs + customers) : prisma_1.prisma.user.count({ where: userWhere }),
                prisma_1.prisma.booking.count({ where: { ...bookingWhere, createdAt: { gte: todayStart } } }),
                prisma_1.prisma.booking.count({ where: bookingWhere }),
                prisma_1.prisma.paymentRecord.aggregate({
                    where: {
                        ...paymentWhere,
                        status: 'CAPTURED',
                        createdAt: { gte: todayStart }
                    },
                    _sum: { amount: true }
                }),
                isSuperAdmin ? prisma_1.prisma.failedBooking.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
                prisma_1.prisma.priceRequest.count({ where: { status: 'PENDING' } })
            ]);
            const todayAmount = todayAmountAgg._sum.amount || 0;
            const timelineRaw = isSuperAdmin
                ? await prisma_1.prisma.$queryRaw `
                    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(id) as count, SUM(amount) as amount
                    FROM "PaymentRecord"
                    WHERE status = 'CAPTURED' AND "createdAt" >= ${thirtyDaysAgo}
                    GROUP BY day
                    ORDER BY day ASC
                `
                : await prisma_1.prisma.$queryRaw `
                    SELECT DATE_TRUNC('day', p."createdAt") as day, COUNT(p.id) as count, SUM(p.amount) as amount
                    FROM "PaymentRecord" p
                    JOIN "User" c ON p."userId" = c.id
                    JOIN "User" sm ON c."createdByUserId" = sm.id
                    WHERE p.status = 'CAPTURED'
                      AND p."createdAt" >= ${thirtyDaysAgo}
                      AND sm."createdByUserId" = ${userId}
                      AND sm.role = 'SALES_MANAGER'
                    GROUP BY day
                    ORDER BY day ASC
                `;
            const timeline = timelineRaw.map(row => ({
                date: row.day instanceof Date ? row.day.toISOString().split('T')[0] : new Date(row.day).toISOString().split('T')[0],
                count: Number(row.count),
                amount: Math.round(Number(row.amount))
            }));
            const statsData = {
                userCount: superAdmins + admins + salesMgrs + customers,
                teamCount: teamMembersCount,
                todayBookings,
                bookingCount: totalBookings,
                todayAmount,
                timeline,
                failedBookingCount,
                priceRequestCount,
                SUPER_ADMIN: superAdmins,
                ADMIN: admins,
                SALES_MANAGER: salesMgrs,
                CUSTOMER: customers
            };
            statsCache.set(cacheKey, { data: statsData, expiry: Date.now() + STATS_CACHE_TTL });
            return res.json(statsData);
        }
        if (role === 'SALES_MANAGER') {
            const [todayCount, totalCount] = await Promise.all([
                prisma_1.prisma.booking.count({ where: { user: { createdByUserId: userId }, createdAt: { gte: todayStart } } }),
                prisma_1.prisma.booking.count({ where: { user: { createdByUserId: userId } } })
            ]);
            const statsData = { todayBookings: todayCount, bookingCount: totalCount, timeline: [] };
            statsCache.set(cacheKey, { data: statsData, expiry: Date.now() + STATS_CACHE_TTL });
            return res.json(statsData);
        }
        return res.status(403).json({ error: 'Unauthorized' });
    }
    catch (error) {
        console.error('Fetch stats error:', error);
        return res.status(500).json({ error: error.message });
    }
});
// Get sales data for dashboard
// Get sales data for dashboard
router.get('/sales', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user;
    try {
        let paymentWhere = { status: 'CAPTURED' };
        let bookingWhere = {};
        let commissionWhere = { type: 'CREDIT', description: { contains: 'Commission' } };
        if (role === 'ADMIN') {
            const scope = req.query.scope;
            if (scope !== 'all') {
                paymentWhere = {
                    status: 'CAPTURED',
                    user: {
                        createdBy: {
                            createdByUserId: userId,
                            role: 'SALES_MANAGER'
                        }
                    }
                };
                bookingWhere = {
                    user: {
                        createdBy: {
                            createdByUserId: userId,
                            role: 'SALES_MANAGER'
                        }
                    }
                };
                commissionWhere = {
                    type: 'CREDIT',
                    description: { contains: 'Commission' },
                    user: {
                        createdByUserId: userId,
                        role: 'SALES_MANAGER'
                    }
                };
            }
        }
        else if (role === 'SALES_MANAGER') {
            const scope = req.query.scope;
            if (scope === 'team') {
                const currentUser = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { createdByUserId: true }
                });
                if (currentUser?.createdByUserId) {
                    paymentWhere = {
                        status: 'CAPTURED',
                        user: {
                            createdBy: {
                                createdByUserId: currentUser.createdByUserId,
                                role: 'SALES_MANAGER'
                            }
                        }
                    };
                    bookingWhere = {
                        user: {
                            createdBy: {
                                createdByUserId: currentUser.createdByUserId,
                                role: 'SALES_MANAGER'
                            }
                        }
                    };
                    commissionWhere = {
                        type: 'CREDIT',
                        description: { contains: 'Commission' },
                        user: {
                            createdByUserId: currentUser.createdByUserId,
                            role: 'SALES_MANAGER'
                        }
                    };
                }
                else {
                    paymentWhere = { status: 'CAPTURED', user: { createdByUserId: userId } };
                    bookingWhere = { user: { createdByUserId: userId } };
                    commissionWhere = { userId, type: 'CREDIT', description: { contains: 'Commission' } };
                }
            }
            else {
                paymentWhere = { status: 'CAPTURED', user: { createdByUserId: userId } };
                bookingWhere = { user: { createdByUserId: userId } };
                commissionWhere = { userId, type: 'CREDIT', description: { contains: 'Commission' } };
            }
        }
        const [revenueStats, recentBookings, commissionStats] = await Promise.all([
            prisma_1.prisma.paymentRecord.aggregate({
                where: paymentWhere,
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma_1.prisma.booking.findMany({
                where: bookingWhere,
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: { select: { email: true, mobile: true } },
                    event: { select: { name: true } }
                }
            }),
            prisma_1.prisma.walletTransaction.aggregate({
                where: commissionWhere,
                _sum: { amount: true }
            })
        ]);
        const recentPayments = await prisma_1.prisma.paymentRecord.findMany({
            where: paymentWhere,
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        const totalRevenue = revenueStats._sum.amount || 0;
        const totalSalesCount = revenueStats._count.id;
        const totalCommission = commissionStats._sum.amount || 0;
        // Aggregate by day for the chart
        const revenueByDay = {};
        recentPayments.forEach(payment => {
            const date = payment.createdAt.toISOString().split('T')[0];
            if (!revenueByDay[date])
                revenueByDay[date] = 0;
            revenueByDay[date] += payment.amount;
        });
        const timelineData = Object.entries(revenueByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, amount]) => ({ date, amount }));
        return res.json({
            totalRevenue,
            recentBookings,
            totalSalesCount,
            totalCommission,
            timelineData
        });
    }
    catch (error) {
        console.error('Fetch sales data error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Get recent activity feed (Audit logs + Recent Bookings)
router.get('/activity-feed', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { role, userId } = req.user;
    try {
        const auditWhere = role === 'ADMIN' ? { performedByUserId: userId } : {};
        const bookingWhere = role === 'ADMIN' ? { user: { createdByUserId: userId } } : {};
        const [auditLogs, bookings] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where: auditWhere,
                take: 15,
                orderBy: { timestamp: 'desc' },
                include: { performedByUser: { select: { name: true, email: true, role: true } } }
            }),
            prisma_1.prisma.booking.findMany({
                where: bookingWhere,
                take: 15,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    event: { select: { name: true } }
                }
            })
        ]);
        const activities = [
            ...auditLogs.map(log => ({
                id: log.id,
                type: 'SYSTEM',
                action: log.action,
                details: log.details,
                timestamp: log.timestamp,
                user: log.performedByUser.name || log.performedByUser.email,
                userRole: log.performedByUser.role
            })),
            ...bookings.map(b => ({
                id: b.id,
                type: 'BOOKING',
                action: 'NEW_BOOKING',
                details: `Reserved: ${b.event.name}`,
                timestamp: b.createdAt,
                user: b.user.name || b.user.email,
                status: b.status
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
        return res.json(activities);
    }
    catch (error) {
        console.error('Fetch activity feed error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Consolidate Statistics & Activity into a single High-Velocity Dashboard Payload
router.get('/dashboard-data', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { role, userId } = req.user;
    const cacheKey = `dashboard-bundle-${role}-${userId}`;
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
        console.log(`[DashboardBundle] Cache HIT for ${cacheKey}`);
        return res.json(cached.data);
    }
    try {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const userWhere = role === 'ADMIN' ? { createdByUserId: userId, role: 'SALES_MANAGER' } : {};
        const bookingWhere = role === 'ADMIN' ? { user: { createdBy: { createdByUserId: userId, role: 'SALES_MANAGER' } } } : {};
        const paymentWhere = role === 'ADMIN' ? { user: { createdBy: { createdByUserId: userId, role: 'SALES_MANAGER' } } } : {};
        const auditWhere = role === 'ADMIN' ? { performedByUserId: userId } : {};
        const isSuperAdmin = role === 'SUPER_ADMIN';
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const timelinePromise = isSuperAdmin
            ? prisma_1.prisma.$queryRaw `
                SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(id) as count, SUM(amount) as amount
                FROM "PaymentRecord"
                WHERE status = 'CAPTURED' AND "createdAt" >= ${thirtyDaysAgo}
                GROUP BY day
                ORDER BY day ASC
            `
            : prisma_1.prisma.$queryRaw `
                SELECT DATE_TRUNC('day', p."createdAt") as day, COUNT(p.id) as count, SUM(p.amount) as amount
                FROM "PaymentRecord" p
                JOIN "User" c ON p."userId" = c.id
                JOIN "User" sm ON c."createdByUserId" = sm.id
                WHERE p.status = 'CAPTURED'
                  AND p."createdAt" >= ${thirtyDaysAgo}
                  AND sm."createdByUserId" = ${userId}
                  AND sm.role = 'SALES_MANAGER'
                GROUP BY day
                ORDER BY day ASC
            `;
        // 1. Fetch all dashboard stats concurrently
        const [roleCounts, teamMembersCount, todayBookings, totalBookings, todayAmountAgg, failedBookingCount, priceRequestCount, auditLogs, recentBookings, timelineRaw] = await Promise.all([
            prisma_1.prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true }
            }),
            prisma_1.prisma.user.count({ where: userWhere }),
            prisma_1.prisma.booking.count({ where: { ...bookingWhere, createdAt: { gte: todayStart } } }),
            prisma_1.prisma.booking.count({ where: bookingWhere }),
            prisma_1.prisma.paymentRecord.aggregate({
                where: {
                    ...paymentWhere,
                    status: 'CAPTURED',
                    createdAt: { gte: todayStart }
                },
                _sum: { amount: true }
            }),
            isSuperAdmin ? prisma_1.prisma.failedBooking.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
            prisma_1.prisma.priceRequest.count({ where: { status: 'PENDING' } }),
            prisma_1.prisma.auditLog.findMany({
                where: auditWhere,
                take: 15,
                orderBy: { timestamp: 'desc' },
                include: { performedByUser: { select: { name: true, email: true, role: true } } }
            }),
            prisma_1.prisma.booking.findMany({
                where: bookingWhere,
                take: 15,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    event: { select: { name: true } }
                }
            }),
            timelinePromise
        ]);
        let superAdmins = 0;
        let admins = 0;
        let salesMgrs = 0;
        let customers = 0;
        roleCounts.forEach(group => {
            if (group.role === 'SUPER_ADMIN')
                superAdmins = group._count._all;
            else if (group.role === 'ADMIN')
                admins = group._count._all;
            else if (group.role === 'SALES_MANAGER')
                salesMgrs = group._count._all;
            else if (group.role === 'CUSTOMER')
                customers = group._count._all;
        });
        const todayAmount = todayAmountAgg._sum.amount || 0;
        const timeline = timelineRaw.map(row => ({
            date: row.day instanceof Date ? row.day.toISOString().split('T')[0] : new Date(row.day).toISOString().split('T')[0],
            count: Number(row.count),
            amount: Math.round(Number(row.amount))
        }));
        const activities = [
            ...auditLogs.map(log => ({
                id: log.id, type: 'SYSTEM', action: log.action, details: log.details,
                timestamp: log.timestamp, user: log.performedByUser.name || log.performedByUser.email,
                userRole: log.performedByUser.role
            })),
            ...recentBookings.map(b => ({
                id: b.id, type: 'BOOKING', action: 'NEW_BOOKING', details: `Reserved: ${b.event.name}`,
                timestamp: b.createdAt, user: b.user.name || b.user.email, status: b.status
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
        const bundle = {
            stats: {
                userCount: superAdmins + admins + salesMgrs + customers,
                teamCount: teamMembersCount, todayBookings, bookingCount: totalBookings,
                todayAmount, timeline, failedBookingCount, priceRequestCount,
                SUPER_ADMIN: superAdmins, ADMIN: admins, SALES_MANAGER: salesMgrs, CUSTOMER: customers
            },
            activities
        };
        statsCache.set(cacheKey, { data: bundle, expiry: Date.now() + STATS_CACHE_TTL });
        return res.json(bundle);
    }
    catch (error) {
        console.error('Fetch dashboard data error:', error);
        return res.status(500).json({ error: error.message });
    }
});
// Get all bookings
// Get bookings
router.get('/bookings', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user;
    try {
        let where = {};
        if (role === 'ADMIN') {
            const scope = req.query.scope;
            if (scope === 'all') {
                where = {}; // Super view for management
            }
            else {
                // Default: See bookings from Sales Managers created by this Admin
                where = {
                    user: {
                        createdBy: {
                            createdByUserId: userId,
                            role: 'SALES_MANAGER'
                        }
                    }
                };
            }
        }
        else if (role === 'SALES_MANAGER') {
            const scope = req.query.scope;
            if (scope === 'team') {
                // Find the admin who created this sales manager
                const currentUser = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { createdByUserId: true }
                });
                if (currentUser?.createdByUserId) {
                    // See bookings from all Sales Managers created by the same admin
                    where = {
                        user: {
                            createdBy: {
                                createdByUserId: currentUser.createdByUserId,
                                role: 'SALES_MANAGER'
                            }
                        }
                    };
                }
                else {
                    // Fallback to self-only if no creator (unlikely for a sales manager)
                    where = { user: { createdByUserId: userId } };
                }
            }
            else {
                // Default: Only see self bookings
                where = { user: { createdByUserId: userId } };
            }
        }
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const [bookings, total] = await Promise.all([
            prisma_1.prisma.booking.findMany({
                where,
                orderBy: { createdAt: 'desc' }, // Switched to createdAt for performance index
                take: limit,
                skip,
                include: {
                    user: { select: { email: true, mobile: true } },
                    event: { select: { name: true, date: true, description: true } },
                    refundRecords: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            }),
            prisma_1.prisma.booking.count({ where })
        ]);
        // Map PaymentRecord amount to each booking
        const paymentIds = bookings.map(b => b.paymentId).filter(Boolean);
        const payments = await prisma_1.prisma.paymentRecord.findMany({
            where: { paymentId: { in: paymentIds } },
            select: { paymentId: true, amount: true }
        });
        const paymentMap = new Map(payments.map(p => [p.paymentId, p.amount]));
        const bookingsWithAmount = bookings.map(b => ({
            ...b,
            amount: b.paymentId ? (paymentMap.get(b.paymentId) || 0) : 0
        }));
        return res.json({ bookings: bookingsWithAmount, total, page, limit });
    }
    catch (error) {
        console.error('Fetch bookings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Get transactions
router.get('/transactions', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user;
    try {
        let where = {};
        if (role === 'ADMIN') {
            const scope = req.query.scope;
            if (scope === 'me') {
                where = { userId };
            }
            else {
                where = {
                    user: {
                        createdBy: {
                            createdByUserId: userId,
                            role: 'SALES_MANAGER'
                        }
                    }
                };
            }
        }
        else if (role === 'SALES_MANAGER') {
            const scope = req.query.scope;
            if (scope === 'team') {
                const currentUser = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { createdByUserId: true }
                });
                if (currentUser?.createdByUserId) {
                    where = {
                        user: {
                            createdBy: {
                                createdByUserId: currentUser.createdByUserId,
                                role: 'SALES_MANAGER'
                            }
                        }
                    };
                }
                else {
                    where = { user: { createdByUserId: userId } };
                }
            }
            else {
                where = { user: { createdByUserId: userId } };
            }
        }
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            prisma_1.prisma.paymentRecord.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    user: { select: { email: true } }
                }
            }),
            prisma_1.prisma.paymentRecord.count({ where })
        ]);
        const paymentIds = transactions.map(p => p.paymentId).filter(Boolean);
        const [linkedBookings, refunds] = await Promise.all([
            prisma_1.prisma.booking.findMany({
                where: { paymentId: { in: paymentIds } },
                select: { id: true, paymentId: true }
            }),
            prisma_1.prisma.refundRecord.findMany({
                where: { paymentId: { in: paymentIds } },
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
        const enhancedTransactions = transactions.map((payment) => {
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
        return res.json({ payments: enhancedTransactions, total, page, limit });
    }
    catch (error) {
        console.error('Fetch transactions error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Cancel a booking
router.put('/bookings/:id/cancel', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            return await (0, cancellation_1.cancelPassengersOrBooking)(tx, id);
        });
        const booking = await prisma_1.prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (result.refund && booking) {
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
        await (0, auditService_1.createAuditLog)({
            action: 'CANCEL_BOOKING',
            performedByUserId: req.user.userId,
            details: `Booking ${id} was cancelled by Admin.`,
            targetUserId: booking.userId
        });
        // Trigger Notification Webhook
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { id: booking.userId },
            select: { email: true, mobile: true }
        });
        if (targetUser) {
            await (0, notificationService_1.notifyBookingCancelled)(targetUser.email, 'Cancelled by Admin', targetUser.mobile || undefined);
        }
        return res.json({ success: true, message: 'Booking cancelled successfully' });
    }
    catch (error) {
        console.error('Cancel booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Hard Delete a booking (Super Admin Only)
router.delete('/bookings/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        const booking = await prisma_1.prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // Clean up ticket file if it exists
        if (booking.ticketUrl) {
            const filename = path_1.default.basename(booking.ticketUrl);
            const filePath = path_1.default.join(__dirname, '..', '..', 'uploads', filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await prisma_1.prisma.booking.delete({ where: { id } });
        await (0, auditService_1.createAuditLog)({
            action: 'DELETE_BOOKING',
            performedByUserId: req.user.userId,
            details: `Booking ${id} was permanently deleted by Super Admin.`,
            targetUserId: booking.userId
        });
        return res.json({ success: true, message: 'Booking permanently deleted.' });
    }
    catch (error) {
        console.error('Delete booking error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Upload a PDF Ticket
router.post('/bookings/:id/ticket', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), upload.single('ticket'), async (req, res) => {
    const id = req.params.id;
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }
    try {
        const ticketPath = `/uploads/${req.file.filename}`;
        await prisma_1.prisma.booking.update({
            where: { id },
            data: {
                ticketUrl: ticketPath,
                status: 'CONFIRMED'
            }
        });
        return res.json({ success: true, ticketUrl: ticketPath });
    }
    catch (error) {
        console.error('Ticket upload error:', error);
        return res.status(500).json({ error: 'Failed to save ticket URL.' });
    }
});
// Delete a PDF Ticket
router.delete('/bookings/:id/ticket', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        const booking = await prisma_1.prisma.booking.findUnique({ where: { id } });
        if (!booking || !booking.ticketUrl) {
            return res.status(404).json({ error: 'Ticket not found or already deleted.' });
        }
        const filename = path_1.default.basename(booking.ticketUrl);
        const filePath = path_1.default.join(__dirname, '..', '..', 'uploads', filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        await prisma_1.prisma.booking.update({
            where: { id },
            data: { ticketUrl: null }
        });
        return res.json({ success: true, message: 'Ticket deleted successfully.' });
    }
    catch (error) {
        console.error('Ticket deletion error:', error);
        return res.status(500).json({ error: 'Failed to delete ticket.' });
    }
});
// Re-book a booking (Change Date)
router.put('/bookings/:id/rebook', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    const { newDate } = req.body;
    if (!newDate)
        return res.status(400).json({ error: 'New date is required.' });
    try {
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id },
            include: { event: true }
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found.' });
        // Create a new event with the new date but same name/description template
        const newEvent = await prisma_1.prisma.event.create({
            data: {
                name: booking.event.name,
                description: booking.event.description.replace(/on .* Passengers/, `on ${new Date(newDate).toDateString()}. Passengers`),
                date: new Date(newDate)
            }
        });
        await prisma_1.prisma.booking.update({
            where: { id },
            data: { eventId: newEvent.id }
        });
        return res.json({ success: true, newEvent });
    }
    catch (error) {
        console.error('Re-booking error:', error);
        return res.status(500).json({ error: 'Failed to re-book.' });
    }
});
// Update booking status manually (Success/Pending/Cancelled)
router.patch('/bookings/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'SUCCESS', 'CANCELLED', 'CONFIRMED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        const booking = await prisma_1.prisma.$transaction(async (tx) => {
            if (status === 'CANCELLED') {
                const cancelRes = await (0, cancellation_1.cancelPassengersOrBooking)(tx, id);
                if (cancelRes.refund) {
                    await refundQueue_1.refundQueue.add('process-refund', {
                        refundId: cancelRes.refund.id,
                        paymentId: cancelRes.refund.paymentId,
                        amount: cancelRes.refund.amount
                    });
                    (0, razorpayService_1.processTicketRefund)(cancelRes.refund.id).catch((err) => {
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
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_BOOKING_STATUS',
            performedByUserId: req.user.userId,
            details: `Booking ${id} status updated to ${status} by Admin.`,
            targetUserId: booking.userId
        });
        // Trigger Notification if status becomes CONFIRMED
        if (status === 'CONFIRMED') {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: booking.userId },
                select: { email: true, mobile: true }
            });
            const event = await prisma_1.prisma.event.findUnique({ where: { id: booking.eventId } });
            if (user && event) {
                (0, notificationService_1.notifyBookingConfirmed)(user.email, event.name, user.mobile || undefined).catch(err => console.error('Admin status update notification background error:', err));
            }
        }
        return res.json({ success: true, booking });
    }
    catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// ── Super Admin & Admin: Get all users (grouped data for User Management page) ──────────
router.get('/users', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { role, userId } = req.user;
        let where = {};
        if (role === 'ADMIN') {
            where = { createdByUserId: userId };
        }
        const limit = parseInt(req.query.limit) || 5000;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
                take: limit,
                skip,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    mobile: true,
                    role: true,
                    region: true,
                    status: true,
                    walletBalance: true,
                    createdAt: true,
                    createdByUserId: true,
                    _count: { select: { bookings: true } }
                }
            }),
            prisma_1.prisma.user.count({ where })
        ]);
        return res.json({ success: true, users, total, page, limit });
    }
    catch (error) {
        console.error('Fetch all users error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// ── Super Admin: Update a user's status (Block/Restrict) ────────────────────
router.patch('/users/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const validStatuses = ['ACTIVE', 'BLOCKED', 'RESTRICTED'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    if (id === req.user.userId) {
        return res.status(400).json({ error: 'You cannot block your own account.' });
    }
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser)
            return res.status(404).json({ error: 'User not found' });
        // ADMIN can only update users they created
        if (req.user.role === 'ADMIN') {
            if (targetUser.createdByUserId !== req.user.userId) {
                return res.status(403).json({ error: 'Unauthorized: You can only manage users you created.' });
            }
            if (targetUser.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Unauthorized: Admins cannot block Super Admins.' });
            }
        }
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: { status },
            select: { id: true, email: true, status: true }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                action: 'UPDATE_USER_STATUS',
                performedByUserId: req.user.userId,
                targetUserId: id,
                details: `Updated status of ${user.email} to ${status}`
            }
        });
        return res.json({ success: true, user });
    }
    catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// ── Super Admin: Change a user's role ────────────────────────────────────────
router.patch('/users/:id/role', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    const { role } = req.body;
    const validRoles = ['CUSTOMER', 'SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }
    if (id === req.user.userId) {
        return res.status(400).json({ error: 'You cannot change your own role.' });
    }
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser)
            return res.status(404).json({ error: 'User not found' });
        // ADMIN restrictions
        if (req.user.role === 'ADMIN') {
            if (targetUser.createdByUserId !== req.user.userId) {
                return res.status(403).json({ error: 'Unauthorized: You can only manage users you created.' });
            }
            if (role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Admins cannot promote users to Super Admin.' });
            }
        }
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, email: true, role: true }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                action: 'CHANGE_USER_ROLE',
                performedByUserId: req.user.userId,
                targetUserId: id,
                details: `Changed role of ${user.email} to ${role}`
            }
        });
        return res.json({ success: true, user });
    }
    catch (error) {
        console.error('Change role error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// ── Super Admin & Admin: Delete a user and cascade clear their records ────────────────────
router.delete('/users/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    if (id === req.user.userId) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser)
            return res.status(404).json({ error: 'User not found' });
        // ADMIN restrictions
        if (req.user.role === 'ADMIN') {
            if (targetUser.createdByUserId !== req.user.userId) {
                return res.status(403).json({ error: 'Unauthorized: You can only delete users you created.' });
            }
            if (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMIN') {
                return res.status(403).json({ error: 'Unauthorized: Admins cannot delete Admin or Super Admin accounts.' });
            }
        }
        // Cascade delete all relations to avoid foreign key violations in database
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.walletTransaction.deleteMany({ where: { userId: id } }),
            prisma_1.prisma.withdrawalRequest.deleteMany({ where: { userId: id } }),
            prisma_1.prisma.priceRequest.deleteMany({ where: { userId: id } }),
            prisma_1.prisma.auditLog.deleteMany({ where: { targetUserId: id } }),
            prisma_1.prisma.auditLog.deleteMany({ where: { performedByUserId: id } }),
            prisma_1.prisma.refundRecord.deleteMany({ where: { userId: id } }),
            prisma_1.prisma.paymentRecord.deleteMany({ where: { userId: id } }),
            prisma_1.prisma.booking.deleteMany({ where: { userId: id } }),
            prisma_1.prisma.user.updateMany({ where: { createdByUserId: id }, data: { createdByUserId: null } }),
            prisma_1.prisma.user.delete({ where: { id } })
        ]);
        await prisma_1.prisma.auditLog.create({
            data: {
                action: 'DELETE_USER',
                performedByUserId: req.user.userId,
                details: `Permanently deleted user account ${targetUser.email} (ID: ${id})`
            }
        });
        return res.json({ success: true, message: `User ${targetUser.email} was permanently deleted.` });
    }
    catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Get Audit Logs
router.get('/audit-logs', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { role, userId } = req.user;
        let where = {};
        // ADMIN can only see logs for users they created or logs they performed
        if (role === 'ADMIN') {
            where = {
                OR: [
                    { performedByUserId: userId },
                    { targetUser: { createdByUserId: userId } }
                ]
            };
        }
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                take: limit,
                skip,
                include: {
                    performedByUser: { select: { email: true, name: true } },
                    targetUser: { select: { email: true, name: true } }
                }
            }),
            prisma_1.prisma.auditLog.count({ where })
        ]);
        return res.json({ success: true, logs, total, page, limit });
    }
    catch (error) {
        console.error('Fetch audit logs error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
