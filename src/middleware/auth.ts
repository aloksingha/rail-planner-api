import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

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

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        
        // Critical: Check user status in DB for real-time blocking
        import('../prisma').then(async ({ prisma }) => {
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { status: true }
            });

            if (!user || user.status === 'BLOCKED') {
                return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
            }

            req.user = payload;
            next();
        }).catch(err => {
            console.error('Auth status check error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
};
