import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';
import { isValidIndianMobile } from '../utils/validation';
import { notifyBookingCancelled, notifyBookingConfirmed } from '../services/notificationService';
import { createAuditLog } from '../services/auditService';
import { refundQueue } from '../queue/refundQueue';
import { processTicketRefund } from '../services/razorpayService';
import multer from 'multer';
import { handleBookingCancellation } from '../utils/commission';
import { cancelPassengersOrBooking } from '../utils/cancellation';
import path from 'path';
import fs from 'fs';

import usersRouter from './admin/users';
import refundsRouter from './admin/refunds';
import bookingsRouter from './admin/bookings';

const router = Router();
router.use('/', usersRouter);
router.use('/', refundsRouter);
router.use('/', bookingsRouter);

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



// Admin or Super Admin can assign roles/register users
router.post('/assign-role', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { email, name, mobile, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ error: 'Missing email or role' });
    }

    if (mobile && !isValidIndianMobile(mobile)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
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

            await createAuditLog({
                action: 'ASSIGN_ROLE',
                targetUserId: user.id,
                performedByUserId: req.user!.userId,
                details: `Assigned role ${role} to ${email}`
            });
        });

        return res.json({ success: true, message: `Role ${role} assigned to ${email} successfully` });
    } catch (error: any) {
        console.error('Assign role error:', error);
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

// CACHE for statistics
const statsCache = new Map<string, { data: any, expiry: number }>();
const STATS_CACHE_TTL = 60 * 1000; // 1 minute cache for stats

// Get system stats for dashboard
router.get('/stats', requireAuth, async (req, res) => {
    const { role, userId } = req.user!;
    
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
            const roleCounts = await prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true }
            });

            let superAdmins = 0;
            let admins = 0;
            let salesMgrs = 0;
            let customers = 0;

            roleCounts.forEach(group => {
                if (group.role === 'SUPER_ADMIN') superAdmins = group._count._all;
                else if (group.role === 'ADMIN') admins = group._count._all;
                else if (group.role === 'SALES_MANAGER') salesMgrs = group._count._all;
                else if (group.role === 'CUSTOMER') customers = group._count._all;
            });

            // 2. Fetch other stats concurrently
            const isSuperAdmin = role === 'SUPER_ADMIN';
            const [
                teamMembersCount,
                todayBookings, totalBookings,
                todayAmountAgg,
                failedBookingCount,
                priceRequestCount
            ] = await Promise.all([
                isSuperAdmin ? Promise.resolve(superAdmins + admins + salesMgrs + customers) : prisma.user.count({ where: userWhere }),
                prisma.booking.count({ where: { ...bookingWhere, createdAt: { gte: todayStart } } }),
                prisma.booking.count({ where: bookingWhere }),
                prisma.paymentRecord.aggregate({
                    where: { 
                        ...paymentWhere, 
                        status: 'CAPTURED', 
                        createdAt: { gte: todayStart } 
                    },
                    _sum: { amount: true }
                }),
                isSuperAdmin ? prisma.failedBooking.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
                prisma.priceRequest.count({ where: { status: 'PENDING' } })
            ]);

            const todayAmount = todayAmountAgg._sum.amount || 0;

            const timelineRaw = isSuperAdmin 
                ? await prisma.$queryRaw<Array<{ day: Date; count: bigint; amount: number }>>`
                    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(id) as count, SUM(amount) as amount
                    FROM "PaymentRecord"
                    WHERE status = 'CAPTURED' AND "createdAt" >= ${thirtyDaysAgo}
                    GROUP BY day
                    ORDER BY day ASC
                `
                : await prisma.$queryRaw<Array<{ day: Date; count: bigint; amount: number }>>`
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
                prisma.booking.count({ where: { user: { createdByUserId: userId }, createdAt: { gte: todayStart } } }),
                prisma.booking.count({ where: { user: { createdByUserId: userId } } })
            ]);
            const statsData = { todayBookings: todayCount, bookingCount: totalCount, timeline: [] };
            statsCache.set(cacheKey, { data: statsData, expiry: Date.now() + STATS_CACHE_TTL });
            return res.json(statsData);
        }

        return res.status(403).json({ error: 'Unauthorized' });
    } catch (error: any) {
        console.error('Fetch stats error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Get sales data for dashboard
// Get sales data for dashboard
router.get('/sales', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user!;
    try {
        let paymentWhere: any = { status: 'CAPTURED' };
        let bookingWhere: any = {};
        let commissionWhere: any = { type: 'CREDIT', description: { contains: 'Commission' } };

        if (role === 'ADMIN') {
            const scope = req.query.scope as string;
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
        } else if (role === 'SALES_MANAGER') {
            const scope = req.query.scope as string;
            if (scope === 'team') {
                const currentUser = await prisma.user.findUnique({
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
                } else {
                    paymentWhere = { status: 'CAPTURED', user: { createdByUserId: userId } };
                    bookingWhere = { user: { createdByUserId: userId } };
                    commissionWhere = { userId, type: 'CREDIT', description: { contains: 'Commission' } };
                }
            } else {
                paymentWhere = { status: 'CAPTURED', user: { createdByUserId: userId } };
                bookingWhere = { user: { createdByUserId: userId } };
                commissionWhere = { userId, type: 'CREDIT', description: { contains: 'Commission' } };
            }
        }

        const [revenueStats, recentBookings, commissionStats] = await Promise.all([
            prisma.paymentRecord.aggregate({
                where: paymentWhere,
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.booking.findMany({
                where: bookingWhere,
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: { select: { email: true, mobile: true } },
                    event: { select: { name: true } }
                }
            }),
            prisma.walletTransaction.aggregate({
                where: commissionWhere,
                _sum: { amount: true }
            })
        ]);

        const recentPayments = await prisma.paymentRecord.findMany({
            where: paymentWhere,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const totalRevenue = revenueStats._sum.amount || 0;
        const totalSalesCount = revenueStats._count.id;
        const totalCommission = commissionStats._sum.amount || 0;

        // Aggregate by day for the chart
        const revenueByDay: Record<string, number> = {};
        recentPayments.forEach(payment => {
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
            totalSalesCount,
            totalCommission,
            timelineData
        });

    } catch (error: any) {
        console.error('Fetch sales data error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get recent activity feed (Audit logs + Recent Bookings)
router.get('/activity-feed', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { role, userId } = req.user!;
    try {
        const auditWhere = role === 'ADMIN' ? { performedByUserId: userId } : {};
        const bookingWhere = role === 'ADMIN' ? { user: { createdByUserId: userId } } : {};

        const [auditLogs, bookings] = await Promise.all([
            prisma.auditLog.findMany({
                where: auditWhere,
                take: 15,
                orderBy: { timestamp: 'desc' },
                include: { performedByUser: { select: { name: true, email: true, role: true } } }
            }),
            prisma.booking.findMany({
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
    } catch (error: any) {
        console.error('Fetch activity feed error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Consolidate Statistics & Activity into a single High-Velocity Dashboard Payload
router.get('/dashboard-data', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { role, userId } = req.user!;
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
            ? prisma.$queryRaw<Array<{ day: Date; count: bigint; amount: number }>>`
                SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(id) as count, SUM(amount) as amount
                FROM "PaymentRecord"
                WHERE status = 'CAPTURED' AND "createdAt" >= ${thirtyDaysAgo}
                GROUP BY day
                ORDER BY day ASC
            `
            : prisma.$queryRaw<Array<{ day: Date; count: bigint; amount: number }>>`
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
        const [
            roleCounts,
            teamMembersCount,
            todayBookings, totalBookings,
            todayAmountAgg,
            failedBookingCount,
            priceRequestCount,
            auditLogs, 
            recentBookings,
            timelineRaw
        ] = await Promise.all([
            prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true }
            }),
            prisma.user.count({ where: userWhere }),
            prisma.booking.count({ where: { ...bookingWhere, createdAt: { gte: todayStart } } }),
            prisma.booking.count({ where: bookingWhere }),
            prisma.paymentRecord.aggregate({
                where: { 
                    ...paymentWhere, 
                    status: 'CAPTURED', 
                    createdAt: { gte: todayStart } 
                },
                _sum: { amount: true }
            }),
            isSuperAdmin ? prisma.failedBooking.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
            prisma.priceRequest.count({ where: { status: 'PENDING' } }),
            prisma.auditLog.findMany({
                where: auditWhere,
                take: 15,
                orderBy: { timestamp: 'desc' },
                include: { performedByUser: { select: { name: true, email: true, role: true } } }
            }),
            prisma.booking.findMany({
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
            if (group.role === 'SUPER_ADMIN') superAdmins = group._count._all;
            else if (group.role === 'ADMIN') admins = group._count._all;
            else if (group.role === 'SALES_MANAGER') salesMgrs = group._count._all;
            else if (group.role === 'CUSTOMER') customers = group._count._all;
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
    } catch (error: any) {
        console.error('Fetch dashboard data error:', error);
        return res.status(500).json({ error: error.message });
    }
});


// Get bookings
router.get('/bookings', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    const { role, userId } = req.user!;
    try {
        let where: any = {};

        if (role === 'ADMIN') {
            const scope = req.query.scope as string;
            if (scope === 'all') {
                if (!req.user!.specialPermissions?.includes('GLOBAL_BOOKINGS')) {
                    return res.status(403).json({ error: 'Forbidden: Requires GLOBAL_BOOKINGS permission' });
                }
                where = {}; // Super view for management
            } else {
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
                            createdBy: {
                                createdByUserId: currentUser.createdByUserId,
                                role: 'SALES_MANAGER'
                            }
                        }
                    };
                } else {
                    // Fallback to self-only if no creator (unlikely for a sales manager)
                    where = { user: { createdByUserId: userId } };
                }
            } else {
                // Default: Only see self bookings
                where = { user: { createdByUserId: userId } };
            }
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
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
            prisma.booking.count({ where })
        ]);

        // Map PaymentRecord amount to each booking
        const paymentIds = bookings.map(b => b.paymentId).filter(Boolean) as string[];
        const payments = await prisma.paymentRecord.findMany({
            where: { paymentId: { in: paymentIds } },
            select: { paymentId: true, amount: true }
        });
        const paymentMap = new Map(payments.map(p => [p.paymentId, p.amount]));

        const bookingsWithAmount = bookings.map(b => ({
            ...b,
            amount: b.paymentId ? (paymentMap.get(b.paymentId) || 0) : 0
        }));

        return res.json({ bookings: bookingsWithAmount, total, page, limit });
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
            const scope = req.query.scope as string;
            if (scope === 'me') {
                where = { userId };
            } else {
                where = {
                    user: {
                        createdBy: {
                            createdByUserId: userId,
                            role: 'SALES_MANAGER'
                        }
                    }
                };
            }
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
                            createdBy: {
                                createdByUserId: currentUser.createdByUserId,
                                role: 'SALES_MANAGER'
                            }
                        }
                    };
                } else {
                    where = { user: { createdByUserId: userId } };
                }
            } else {
                where = { user: { createdByUserId: userId } };
            }
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.paymentRecord.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    user: { select: { email: true } }
                }
            }),
            prisma.paymentRecord.count({ where })
        ]);

        const paymentIds = transactions.map(p => p.paymentId).filter(Boolean) as string[];

        const [linkedBookings, refunds] = await Promise.all([
            prisma.booking.findMany({
                where: { paymentId: { in: paymentIds } },
                select: { id: true, paymentId: true }
            }),
            prisma.refundRecord.findMany({
                where: { paymentId: { in: paymentIds } },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const linkedBookingMap = new Map<string, string>();
        for (const booking of linkedBookings) {
            if (booking.paymentId) {
                linkedBookingMap.set(booking.paymentId, booking.id);
            }
        }

        const refundMap = new Map<string, any>();
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
    } catch (error) {
        console.error('Fetch transactions error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});







// Get Audit Logs
router.get('/audit-logs', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { role, userId } = req.user!;
        let where: any = {};
        
        // ADMIN can only see logs for users they created or logs they performed
        if (role === 'ADMIN') {
            where = {
                OR: [
                    { performedByUserId: userId },
                    { targetUser: { createdByUserId: userId } }
                ]
            };
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                take: limit,
                skip,
                include: {
                    performedByUser: { select: { email: true, name: true } },
                    targetUser: { select: { email: true, name: true } }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        return res.json({ success: true, logs, total, page, limit });
    } catch (error: any) {
        console.error('Fetch audit logs error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;

