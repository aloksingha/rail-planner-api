import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { isValidIndianMobile } from '../../utils/validation';
import { createAuditLog } from '../../services/auditService';

const router = Router();

// Only Super Admins can assign roles
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

            await createAuditLog({
                action: 'ASSIGN_REGION',
                targetUserId,
                performedByUserId: req.user!.userId,
                details: `Assigned region ${region}`
            });
        });

        return res.json({ success: true, message: `Region ${region} assigned successfully` });
    } catch (error: any) {
        console.error('Assign region error:', error);
        return res.status(400).json({ error: error.message || 'Error occurred' });
    }
});

// ── Super Admin & Admin: Get all users (grouped data for User Management page) ──────────
router.get('/users', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { role, userId } = req.user!;
        let where = {};
        
        if (role === 'ADMIN') {
            where = { createdByUserId: userId };
        }

        const limit = parseInt(req.query.limit as string) || 5000;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
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
                    _count: { select: { bookings: true } }
                }
            }),
            prisma.user.count({ where })
        ]);
        return res.json({ success: true, users, total, page, limit });
    } catch (error: any) {
        console.error('Fetch all users error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── Super Admin: Update a user's status (Block/Restrict) ────────────────────
router.patch('/users/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'BLOCKED', 'RESTRICTED'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (id === req.user!.userId) {
        return res.status(400).json({ error: 'You cannot block your own account.' });
    }

    try {
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // ADMIN can only update users they created
        if (req.user!.role === 'ADMIN') {
            if (targetUser.createdByUserId !== req.user!.userId) {
                return res.status(403).json({ error: 'Unauthorized: You can only manage users you created.' });
            }
            if (targetUser.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Unauthorized: Admins cannot block Super Admins.' });
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data: { status },
            select: { id: true, email: true, status: true }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_USER_STATUS',
                performedByUserId: req.user!.userId,
                targetUserId: id,
                details: `Updated status of ${user.email} to ${status}`
            }
        });

        return res.json({ success: true, user });
    } catch (error: any) {
        console.error('Update status error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 🛡️ Super Admin: Update a user's Special Permissions 🛡️
router.put('/users/:id/special-permission', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'permissions must be an array of strings' });
    }

    try {
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (targetUser.role !== 'ADMIN' && targetUser.role !== 'SALES_MANAGER') {
            return res.status(400).json({ error: 'Special Permissions can only be granted to ADMIN or SALES_MANAGER.' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { specialPermissions: permissions },
            select: { id: true, email: true, specialPermissions: true }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_SPECIAL_PERMISSION',
                performedByUserId: req.user!.userId,
                targetUserId: id,
                details: `Updated special permissions for ${user.email}: [${permissions.join(', ')}]`
            }
        });

        return res.json({ success: true, user });
    } catch (error: any) {
        console.error('Update special permissions error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── Super Admin: Change a user's role ────────────────────────────────────────
router.patch('/users/:id/role', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id as string;
    const { role } = req.body;

    const validRoles = ['CUSTOMER', 'SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    if (id === req.user!.userId) {
        return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    try {
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // ADMIN restrictions
        if (req.user!.role === 'ADMIN') {
            if (targetUser.createdByUserId !== req.user!.userId) {
                return res.status(403).json({ error: 'Unauthorized: You can only manage users you created.' });
            }
            if (role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Admins cannot promote users to Super Admin.' });
            }
        }

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

// ── Super Admin & Admin: Delete a user and cascade clear their records ────────────────────
router.delete('/users/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id as string;

    if (id === req.user!.userId) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    try {
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // ADMIN restrictions
        if (req.user!.role === 'ADMIN') {
            if (targetUser.createdByUserId !== req.user!.userId) {
                return res.status(403).json({ error: 'Unauthorized: You can only delete users you created.' });
            }
            if (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMIN') {
                return res.status(403).json({ error: 'Unauthorized: Admins cannot delete Admin or Super Admin accounts.' });
            }
        }

        // Cascade delete all relations to avoid foreign key violations in database
        await prisma.$transaction([
            prisma.walletTransaction.deleteMany({ where: { userId: id } }),
            prisma.withdrawalRequest.deleteMany({ where: { userId: id } }),
            prisma.priceRequest.deleteMany({ where: { userId: id } }),
            prisma.auditLog.deleteMany({ where: { targetUserId: id } }),
            prisma.auditLog.deleteMany({ where: { performedByUserId: id } }),
            prisma.refundRecord.deleteMany({ where: { userId: id } }),
            prisma.paymentRecord.deleteMany({ where: { userId: id } }),
            prisma.booking.deleteMany({ where: { userId: id } }),
            prisma.user.updateMany({ where: { createdByUserId: id }, data: { createdByUserId: null } }),
            prisma.user.delete({ where: { id } })
        ]);

        await prisma.auditLog.create({
            data: {
                action: 'DELETE_USER',
                performedByUserId: req.user!.userId,
                details: `Permanently deleted user account ${targetUser.email} (ID: ${id})`
            }
        });

        return res.json({ success: true, message: `User ${targetUser.email} was permanently deleted.` });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
