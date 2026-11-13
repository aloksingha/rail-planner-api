"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const visitorShieldService_1 = require("../services/visitorShieldService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public: Heartbeat beacon from client browsers and mobile app
router.post('/heartbeat', (req, res) => {
    try {
        const profile = req.body;
        visitorShieldService_1.visitorShield.registerHeartbeat(profile, req);
        return res.status(200).json({ status: 'ok' });
    }
    catch (e) {
        return res.status(200).json({ status: 'ok' }); // Always return 200 for beacon
    }
});
// Super Admin / Public Pulse: Aggregated stats for Platform Operations command card
router.get('/stats', (req, res) => {
    try {
        const stats = visitorShieldService_1.visitorShield.getStats();
        return res.json({ success: true, stats });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve telemetry stats.' });
    }
});
// Super Admin / Admin: Live anonymous visitor telemetry list
router.get('/visitors', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    try {
        const visitors = visitorShieldService_1.visitorShield.getRecentVisitorsList();
        return res.json({ success: true, visitors });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve visitor list.' });
    }
});
// Public: Echo client IP and Edge GeoIP context
router.get('/context', (req, res) => {
    try {
        const context = visitorShieldService_1.visitorShield.inspectRequest(req);
        return res.json({ success: true, context });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to inspect client context.' });
    }
});
exports.default = router;
