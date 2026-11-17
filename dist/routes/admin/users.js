"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const validation_1 = require("../../utils/validation");
const auditService_1 = require("../../services/auditService");
const router = (0, express_1.Router)();
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
// ── Super Admin & Admin: Get all users (grouped data for User Management page) ──────────
router.get('/users', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { role, userId } = req.user;
        let where = {};
        if (role === 'ADMIN') {
            where = { createdByUserId: userId };
        }
        if (req.query.platform && (req.query.platform === 'WEB' || req.query.platform === 'APP')) {
            where = { ...where, lastLoginPlatform: req.query.platform };
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
                    specialPermissions: true,
                    status: true,
                    walletBalance: true,
                    createdAt: true,
                    createdByUserId: true,
                    lastLoginPlatform: true,
                    lastLoginAt: true,
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
// ── Super Admin & Admin: Get Date-wise User Activity History ────────────────
router.get('/users/:id/activity', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { id },
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
                lastLoginPlatform: true,
                lastLoginAt: true
            }
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Admin can only see activity for users they manage (or themselves)
        if (req.user.role === 'ADMIN' && targetUser.createdByUserId !== req.user.userId && req.user.userId !== id) {
            return res.status(403).json({ error: 'Unauthorized: You can only view activity for users you manage.' });
        }
        const [audits, bookings, walletTx, priceReqs, withdrawals, payments] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where: { OR: [{ targetUserId: id }, { performedByUserId: id }] },
                orderBy: { timestamp: 'desc' },
                take: 100
            }),
            prisma_1.prisma.booking.findMany({
                where: { userId: id },
                include: {
                    event: true,
                    refundRecords: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma_1.prisma.walletTransaction.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma_1.prisma.priceRequest.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma_1.prisma.withdrawalRequest.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma_1.prisma.paymentRecord.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);
        const items = [];
        // 1. Audits & Logins
        for (const log of audits) {
            if (log.action === 'USER_LOGIN') {
                let platform = 'WEB';
                try {
                    if (log.details) {
                        const parsed = JSON.parse(log.details);
                        if (parsed.platform === 'APP')
                            platform = 'APP';
                    }
                }
                catch {
                    if (log.details && log.details.includes('APP'))
                        platform = 'APP';
                }
                items.push({
                    id: `audit-${log.id}`,
                    type: 'LOGIN',
                    platform,
                    title: platform === 'APP' ? 'Mobile App Login' : 'Web Portal Login',
                    description: `Authenticated via ${platform === 'APP' ? 'Android Mobile App' : 'Web Browser'}`,
                    timestamp: log.timestamp,
                    status: 'SUCCESS',
                    metadata: { action: log.action, rawDetails: log.details }
                });
            }
            else {
                items.push({
                    id: `audit-${log.id}`,
                    type: 'AUDIT',
                    platform: null,
                    title: `System Action: ${log.action.replace(/_/g, ' ')}`,
                    description: log.details || 'System operation executed',
                    timestamp: log.timestamp,
                    status: 'COMPLETED',
                    metadata: { action: log.action }
                });
            }
        }
        // If user has lastLoginAt and no recent login audit event matches it within 1 minute
        if (targetUser.lastLoginAt) {
            const hasMatchingLogin = items.some(i => i.type === 'LOGIN' && Math.abs(new Date(i.timestamp).getTime() - new Date(targetUser.lastLoginAt).getTime()) < 60000);
            if (!hasMatchingLogin) {
                const platform = targetUser.lastLoginPlatform === 'APP' ? 'APP' : 'WEB';
                items.push({
                    id: `lastlogin-${targetUser.id}`,
                    type: 'LOGIN',
                    platform,
                    title: `${platform === 'APP' ? 'Mobile App' : 'Web Portal'} Login`,
                    description: `Active session recorded via ${platform === 'APP' ? 'Android Mobile App' : 'Web Browser'}`,
                    timestamp: targetUser.lastLoginAt,
                    status: 'SUCCESS',
                    metadata: { platform }
                });
            }
        }
        // 2. Bookings
        for (const b of bookings) {
            items.push({
                id: `booking-${b.id}`,
                type: 'BOOKING',
                platform: b.platform || 'WEB',
                title: `Ticket Booking: ${b.event?.name || 'Rail Reservation'}`,
                description: b.event?.description ? `${b.event.description} • Class: ${b.class || 'Standard'}` : `Class: ${b.class || 'Standard'} • Status: ${b.status}`,
                timestamp: b.createdAt,
                status: b.status,
                metadata: {
                    bookingId: b.id,
                    platform: b.platform,
                    ticketUrl: b.ticketUrl,
                    class: b.class,
                    refundRecords: b.refundRecords
                }
            });
        }
        // 3. Wallet Transactions
        for (const w of walletTx) {
            items.push({
                id: `wallet-${w.id}`,
                type: 'WALLET',
                platform: null,
                title: w.type === 'CREDIT' ? `Wallet Credited (+₹${w.amount})` : `Wallet Debited (-₹${w.amount})`,
                description: w.description || (w.type === 'CREDIT' ? 'Funds added to wallet balance' : 'Payment deducted from wallet'),
                timestamp: w.createdAt,
                status: 'COMPLETED',
                amount: w.type === 'CREDIT' ? w.amount : -w.amount,
                metadata: { type: w.type, bookingId: w.bookingId }
            });
        }
        // 4. Price Requests
        for (const pr of priceReqs) {
            items.push({
                id: `price-${pr.id}`,
                type: 'PRICE_REQUEST',
                platform: null,
                title: `Fare Enquiry: ${pr.trainNumber} ${pr.trainName}`,
                description: `${pr.source} ➔ ${pr.destination} • Class: ${pr.class}${pr.suggestedPrice ? ` • Suggested: ₹${pr.suggestedPrice}` : ''}${pr.adminComment ? ` (${pr.adminComment})` : ''}`,
                timestamp: pr.createdAt,
                status: pr.status,
                metadata: {
                    trainNumber: pr.trainNumber,
                    trainName: pr.trainName,
                    source: pr.source,
                    destination: pr.destination,
                    class: pr.class,
                    suggestedPrice: pr.suggestedPrice
                }
            });
        }
        // 5. Withdrawal Requests
        for (const wr of withdrawals) {
            items.push({
                id: `withdrawal-${wr.id}`,
                type: 'WITHDRAWAL',
                platform: null,
                title: `Withdrawal Request: ₹${wr.amount}`,
                description: `Method: ${wr.method} • Status: ${wr.status}${wr.charge ? ` • Fee: ₹${wr.charge}` : ''}`,
                timestamp: wr.createdAt,
                status: wr.status,
                amount: -wr.amount,
                metadata: { method: wr.method, charge: wr.charge }
            });
        }
        // 6. Payments
        for (const p of payments) {
            items.push({
                id: `payment-${p.id}`,
                type: 'PAYMENT',
                platform: null,
                title: `Payment: ₹${p.amount}`,
                description: `Order: ${p.orderId || p.paymentId} • Status: ${p.status}`,
                timestamp: p.createdAt,
                status: p.status,
                amount: p.amount,
                metadata: { paymentId: p.paymentId, orderId: p.orderId }
            });
        }
        // Sort chronologically descending
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Group by calendar date
        const dateMap = new Map();
        const todayKey = new Date().toISOString().split('T')[0];
        for (const item of items) {
            const d = new Date(item.timestamp);
            const dateKey = d.toISOString().split('T')[0];
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, {
                    dateKey,
                    dateFormatted: d.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    }),
                    isToday: dateKey === todayKey,
                    items: []
                });
            }
            dateMap.get(dateKey).items.push(item);
        }
        const summary = {
            totalEvents: items.length,
            loginCount: items.filter(i => i.type === 'LOGIN').length,
            bookingCount: items.filter(i => i.type === 'BOOKING').length,
            walletCount: items.filter(i => i.type === 'WALLET').length,
            priceRequestCount: items.filter(i => i.type === 'PRICE_REQUEST').length,
            auditCount: items.filter(i => i.type === 'AUDIT').length,
            webEventsCount: items.filter(i => i.platform === 'WEB').length,
            appEventsCount: items.filter(i => i.platform === 'APP').length
        };
        return res.json({
            success: true,
            user: targetUser,
            summary,
            timeline: Array.from(dateMap.values())
        });
    }
    catch (error) {
        console.error('Fetch user activity error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
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
// 🛡️ Super Admin: Update a user's Special Permissions 🛡️
router.put('/users/:id/special-permission', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'permissions must be an array of strings' });
    }
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser)
            return res.status(404).json({ error: 'User not found' });
        if (targetUser.role !== 'ADMIN' && targetUser.role !== 'SALES_MANAGER') {
            return res.status(400).json({ error: 'Special Permissions can only be granted to ADMIN or SALES_MANAGER.' });
        }
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: { specialPermissions: permissions },
            select: { id: true, email: true, specialPermissions: true }
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                action: 'UPDATE_SPECIAL_PERMISSION',
                performedByUserId: req.user.userId,
                targetUserId: id,
                details: `Updated special permissions for ${user.email}: [${permissions.join(', ')}]`
            }
        });
        return res.json({ success: true, user });
    }
    catch (error) {
        console.error('Update special permissions error:', error);
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
exports.default = router;
