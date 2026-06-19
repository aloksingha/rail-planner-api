"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const prisma_1 = require("../prisma");
async function createAuditLog(data) {
    try {
        return await prisma_1.prisma.auditLog.create({
            data: {
                action: data.action,
                performedByUserId: data.performedByUserId,
                targetUserId: data.targetUserId,
                details: data.details
            }
        });
    }
    catch (error) {
        console.error('Audit log creation failed:', error);
        // We don't want to fail the main transaction if audit logging fails
        // but we should at least log it.
        return null;
    }
}
