import { prisma } from '../prisma';

export async function createAuditLog(data: {
    action: string;
    performedByUserId: string;
    targetUserId?: string;
    details?: string;
}) {
    try {
        return await prisma.auditLog.create({
            data: {
                action: data.action,
                performedByUserId: data.performedByUserId,
                targetUserId: data.targetUserId,
                details: data.details
            }
        });
    } catch (error) {
        console.error('Audit log creation failed:', error);
        // We don't want to fail the main transaction if audit logging fails
        // but we should at least log it.
        return null;
    }
}
