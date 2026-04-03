import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

export const requireActiveUser = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { status: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.status === 'BLOCKED') {
            return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
        }

        if (user.status === 'RESTRICTED') {
            return res.status(403).json({ error: 'Your account is restricted. You can view schedules but cannot make new bookings. Please contact support.' });
        }

        next();
    } catch (error) {
        console.error('Restriction check error:', error);
        return res.status(500).json({ error: 'Internal Server Error during security check.' });
    }
};
