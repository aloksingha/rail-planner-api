import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const generateToken = (userId: string, email: string, role: string) => {
    return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1d' });
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = payload;
        next();
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
