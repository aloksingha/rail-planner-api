"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'super-secret-jwt-key') {
    console.warn('⚠️ WARNING: Using fallback JWT_SECRET in production. Ensure JWT_SECRET is set in environment variables!');
}
const generateToken = (userId, email, role, name, isSuperAdmin) => {
    return jsonwebtoken_1.default.sign({ userId, email, role, name, isSuperAdmin }, JWT_SECRET, { expiresIn: '1d' });
};
exports.generateToken = generateToken;
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Critical: Check user status in DB for real-time blocking
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { status: true, role: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found in system' });
        }
        if (user.status === 'BLOCKED') {
            return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
        }
        // Critical: Override token role with real-time DB role ONLY if not mimicking
        // If the token has isSuperAdmin, we allow the 'role' in the token to persist (Mimic Mode)
        if (!payload.isSuperAdmin) {
            payload.role = user.role;
        }
        req.user = payload;
        next();
    }
    catch (err) {
        console.error('Auth verification error:', err);
        return res.status(401).json({
            error: 'Invalid token',
            details: err.message,
            token_present: !!token
        });
    }
};
exports.requireAuth = requireAuth;
const requireRole = (roles) => {
    const normalizedTargetRoles = roles.map(r => r.toUpperCase());
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Forbidden: No role identified' });
        }
        const userRole = req.user.role.toUpperCase();
        // --- MIMIC AWARENESS ---
        // If the user is a Super Admin (even if currently in mimic mode as a Customer),
        // we grant them access to all Administrative routes.
        if (req.user.isSuperAdmin) {
            return next();
        }
        if (!normalizedTargetRoles.includes(userRole)) {
            console.warn(`[Auth] Access Denied. User role: ${userRole}, Required: ${normalizedTargetRoles}`);
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
};
exports.requireRole = requireRole;
