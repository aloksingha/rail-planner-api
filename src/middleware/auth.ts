import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'super-secret-jwt-key') {
    console.warn('⚠️ WARNING: Using fallback JWT_SECRET in production. Ensure JWT_SECRET is set in environment variables!');
}

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    isSuperAdmin?: boolean; // Flag to preserve SA powers during mimicry
    name?: string | null;
    specialPermissions?: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const generateToken = (userId: string, email: string, role: string, name?: string | null, isSuperAdmin?: boolean) => {
    return jwt.sign({ userId, email, role, name, isSuperAdmin }, JWT_SECRET, { expiresIn: '1d' });
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        
        // Critical: Check user status in DB for real-time blocking
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { status: true, role: true, specialPermissions: true }
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
        
        // Inject specialPermissions
        payload.specialPermissions = user.specialPermissions;

        req.user = payload;
        next();
    } catch (err: any) {
        console.error('Auth verification error:', err);
        return res.status(401).json({ 
            error: 'Invalid token', 
            details: err.message,
            token_present: !!token 
        });
    }
};

export const requireRole = (roles: string[], options?: { allowSpecialPermission?: string }) => {
    const normalizedTargetRoles = roles.map(r => r.toUpperCase());
    return (req: Request, res: Response, next: NextFunction) => {
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

        // --- SPECIAL PERMISSION BYPASS ---
        if (options?.allowSpecialPermission && req.user.specialPermissions?.includes(options.allowSpecialPermission) && (userRole === 'ADMIN' || userRole === 'SALES_MANAGER')) {
            return next();
        }

        if (!normalizedTargetRoles.includes(userRole)) {
            console.warn(`[Auth] Access Denied. User role: ${userRole}, Required: ${normalizedTargetRoles}`);
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
};
