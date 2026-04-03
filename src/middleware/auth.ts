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
    name?: string | null;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const generateToken = (userId: string, email: string, role: string, name?: string | null) => {
    return jwt.sign({ userId, email, role, name }, JWT_SECRET, { expiresIn: '1d' });
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
            select: { status: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found in system' });
        }

        if (user.status === 'BLOCKED') {
            return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
        }

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

export const requireRole = (roles: string[]) => {
    const normalizedRoles = roles.map(r => r.toUpperCase());
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !normalizedRoles.includes(req.user.role.toUpperCase())) {
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
};
