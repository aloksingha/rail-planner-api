"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceService = void 0;
const prisma_1 = require("../prisma");
class PresenceTracker {
    inMemorySessions = new Map();
    lastDbPersist = new Map();
    /**
     * Records real-time user presence and activity (throttled DB update)
     */
    recordActivity(user, platform = 'WEB', action = 'Active Session', ip) {
        const now = new Date();
        this.inMemorySessions.set(user.userId, {
            userId: user.userId,
            email: user.email,
            name: user.name || null,
            role: user.role,
            platform,
            lastActiveAt: now,
            action,
            ip
        });
        // Throttle database persistence to at most once per 60 seconds per user
        const lastPersist = this.lastDbPersist.get(user.userId) || 0;
        if (now.getTime() - lastPersist > 60_000) {
            this.lastDbPersist.set(user.userId, now.getTime());
            prisma_1.prisma.user.update({
                where: { id: user.userId },
                data: {
                    lastActiveAt: now,
                    lastActivePlatform: platform
                }
            }).catch(() => { });
        }
    }
    /**
     * Resolves platform from request headers
     */
    resolvePlatform(req) {
        const headerPlatform = req.headers['x-client-platform'];
        if (headerPlatform === 'APP')
            return 'APP';
        if (headerPlatform === 'WEB')
            return 'WEB';
        const userAgent = req.headers['user-agent'] || '';
        if (/okhttp|capacitor|android.*app|ticketspro/i.test(userAgent)) {
            return 'APP';
        }
        return 'WEB';
    }
    /**
     * Returns true if user is considered live online right now (within last 15 minutes)
     */
    isUserOnlineNow(userId, lastActiveAt, lastLoginAt) {
        const cutoff = Date.now() - 15 * 60 * 1000;
        const memorySession = this.inMemorySessions.get(userId);
        if (memorySession && memorySession.lastActiveAt.getTime() >= cutoff) {
            return true;
        }
        if (lastActiveAt && new Date(lastActiveAt).getTime() >= cutoff) {
            return true;
        }
        if (lastLoginAt && new Date(lastLoginAt).getTime() >= cutoff) {
            return true;
        }
        return false;
    }
    /**
     * Aggregates Live Platform Telemetry:
     * - Live Active Now (Last 15 minutes)
     * - Today's Logged-in Users
     * - Today's Bookings
     */
    async getLiveTelemetry(role, adminUserId) {
        const now = new Date();
        const activeCutoff = new Date(now.getTime() - 15 * 60 * 1000);
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const userWhere = role === 'ADMIN' && adminUserId ? { createdByUserId: adminUserId, role: 'SALES_MANAGER' } : {};
        const bookingWhere = role === 'ADMIN' && adminUserId ? { user: { createdBy: { createdByUserId: adminUserId, role: 'SALES_MANAGER' } } } : {};
        // 1. In-memory active now sessions
        let memWeb = 0;
        let memApp = 0;
        const activeUserIdsInMem = new Set();
        this.inMemorySessions.forEach((session, uId) => {
            if (session.lastActiveAt.getTime() >= activeCutoff.getTime()) {
                activeUserIdsInMem.add(uId);
                if (session.platform === 'APP')
                    memApp++;
                else
                    memWeb++;
            }
        });
        // 2. Query DB for users active now (combines lastActiveAt, lastLoginAt)
        const [dbActiveNowWeb, dbActiveNowApp, todayWebLogins, todayAppLogins, todayWebBookings, todayAppBookings] = await Promise.all([
            prisma_1.prisma.user.count({
                where: {
                    ...userWhere,
                    OR: [
                        { lastActiveAt: { gte: activeCutoff }, lastActivePlatform: 'WEB' },
                        { lastLoginAt: { gte: activeCutoff }, lastLoginPlatform: 'WEB' }
                    ]
                }
            }),
            prisma_1.prisma.user.count({
                where: {
                    ...userWhere,
                    OR: [
                        { lastActiveAt: { gte: activeCutoff }, lastActivePlatform: 'APP' },
                        { lastLoginAt: { gte: activeCutoff }, lastLoginPlatform: 'APP' }
                    ]
                }
            }),
            prisma_1.prisma.user.count({
                where: {
                    ...userWhere,
                    lastLoginAt: { gte: todayStart },
                    lastLoginPlatform: 'WEB'
                }
            }),
            prisma_1.prisma.user.count({
                where: {
                    ...userWhere,
                    lastLoginAt: { gte: todayStart },
                    lastLoginPlatform: 'APP'
                }
            }),
            prisma_1.prisma.booking.count({
                where: {
                    ...bookingWhere,
                    createdAt: { gte: todayStart },
                    platform: 'WEB'
                }
            }),
            prisma_1.prisma.booking.count({
                where: {
                    ...bookingWhere,
                    createdAt: { gte: todayStart },
                    platform: 'APP'
                }
            })
        ]);
        // Max of DB count and in-memory count for online now
        const liveActiveWeb = Math.max(dbActiveNowWeb, memWeb);
        const liveActiveApp = Math.max(dbActiveNowApp, memApp);
        return {
            activeNow: {
                total: liveActiveWeb + liveActiveApp,
                web: liveActiveWeb,
                app: liveActiveApp
            },
            todayLogins: {
                total: todayWebLogins + todayAppLogins,
                web: todayWebLogins,
                app: todayAppLogins
            },
            todayBookings: {
                total: todayWebBookings + todayAppBookings,
                web: todayWebBookings,
                app: todayAppBookings
            }
        };
    }
    /**
     * Returns detailed list of Live & Active users with their latest post-login actions
     */
    async getLiveUsersList(role, adminUserId) {
        const now = new Date();
        const activeCutoff = new Date(now.getTime() - 15 * 60 * 1000);
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const userWhere = role === 'ADMIN' && adminUserId ? { createdByUserId: adminUserId, role: 'SALES_MANAGER' } : {};
        // Find users who logged in today OR active in last 48 hours
        const users = await prisma_1.prisma.user.findMany({
            where: {
                ...userWhere,
                OR: [
                    { lastActiveAt: { gte: todayStart } },
                    { lastLoginAt: { gte: todayStart } },
                    { lastLoginAt: { gte: twoDaysAgo } }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                region: true,
                walletBalance: true,
                lastLoginPlatform: true,
                lastLoginAt: true,
                lastActivePlatform: true,
                lastActiveAt: true
            },
            orderBy: [{ lastActiveAt: 'desc' }, { lastLoginAt: 'desc' }],
            take: 100
        });
        // For each user, attach their online status and latest post-login action
        const enrichedUsers = await Promise.all(users.map(async (u) => {
            const memSession = this.inMemorySessions.get(u.id);
            const isOnline = this.isUserOnlineNow(u.id, u.lastActiveAt, u.lastLoginAt);
            const currentPlatform = memSession?.platform || u.lastActivePlatform || u.lastLoginPlatform || 'WEB';
            const lastTimestamp = u.lastActiveAt || u.lastLoginAt || new Date();
            // Get latest activity record for this user
            const [latestBooking, latestPriceReq, latestWallet] = await Promise.all([
                prisma_1.prisma.booking.findFirst({
                    where: { userId: u.id },
                    orderBy: { createdAt: 'desc' },
                    include: { event: true }
                }),
                prisma_1.prisma.priceRequest.findFirst({
                    where: { userId: u.id },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma_1.prisma.walletTransaction.findFirst({
                    where: { userId: u.id },
                    orderBy: { createdAt: 'desc' }
                })
            ]);
            // Determine what the user did post-login
            let latestActionDescription = memSession?.action || 'Active on Platform';
            let latestActionTime = lastTimestamp;
            if (latestBooking && (!latestActionTime || new Date(latestBooking.createdAt) > new Date(latestActionTime))) {
                latestActionDescription = `Booked Ticket: ${latestBooking.event?.name || 'Rail Reservation'} (${latestBooking.status})`;
                latestActionTime = latestBooking.createdAt;
            }
            else if (latestPriceReq && (!latestActionTime || new Date(latestPriceReq.createdAt) > new Date(latestActionTime))) {
                latestActionDescription = `Fare Enquiry: ${latestPriceReq.trainNumber} (${latestPriceReq.source} ➔ ${latestPriceReq.destination})`;
                latestActionTime = latestPriceReq.createdAt;
            }
            else if (latestWallet && (!latestActionTime || new Date(latestWallet.createdAt) > new Date(latestActionTime))) {
                latestActionDescription = `Wallet ${latestWallet.type}: ₹${latestWallet.amount} (${latestWallet.description || ''})`;
                latestActionTime = latestWallet.createdAt;
            }
            else if (u.lastLoginAt) {
                latestActionDescription = `Logged in via ${u.lastLoginPlatform === 'APP' ? 'Android App' : 'Web Portal'}`;
                latestActionTime = u.lastLoginAt;
            }
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                mobile: u.mobile,
                role: u.role,
                status: u.status,
                walletBalance: u.walletBalance,
                isOnlineNow: isOnline,
                platform: currentPlatform,
                lastLoginAt: u.lastLoginAt,
                lastActiveAt: u.lastActiveAt || u.lastLoginAt,
                latestAction: latestActionDescription,
                latestActionTime
            };
        }));
        // Sort: Online Now first, then by last active timestamp descending
        enrichedUsers.sort((a, b) => {
            if (a.isOnlineNow && !b.isOnlineNow)
                return -1;
            if (!a.isOnlineNow && b.isOnlineNow)
                return 1;
            return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
        });
        return enrichedUsers;
    }
}
exports.presenceService = new PresenceTracker();
