import express, { Request, Response } from 'express';
import { visitorShield } from '../services/visitorShieldService';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

// Public: Heartbeat beacon from client browsers and mobile app
router.post('/heartbeat', (req: Request, res: Response) => {
    try {
        const profile = req.body;
        visitorShield.registerHeartbeat(profile, req);
        return res.status(200).json({ status: 'ok' });
    } catch (e: any) {
        return res.status(200).json({ status: 'ok' }); // Always return 200 for beacon
    }
});

// Super Admin / Public Pulse: Aggregated stats for Platform Operations command card
router.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = visitorShield.getStats();
        return res.json({ success: true, stats });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to retrieve telemetry stats.' });
    }
});

// Super Admin / Admin: Live anonymous visitor telemetry list
router.get('/visitors', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), (req: Request, res: Response) => {
    try {
        const visitors = visitorShield.getRecentVisitorsList();
        return res.json({ success: true, visitors });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to retrieve visitor list.' });
    }
});

// Public: Echo client IP and Edge GeoIP context
router.get('/context', (req: Request, res: Response) => {
    try {
        const context = visitorShield.inspectRequest(req);
        return res.json({ success: true, context });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to inspect client context.' });
    }
});

export default router;
