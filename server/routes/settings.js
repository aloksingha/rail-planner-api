"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const auditService_1 = require("../services/auditService");
const router = (0, express_1.Router)();
// Get settings (Public)
router.get('/', async (req, res) => {
    try {
        let settings = await prisma_1.prisma.globalSettings.findUnique({
            where: { id: 'singleton' }
        });
        // Initialize with defaults if not exists
        if (!settings) {
            settings = await prisma_1.prisma.globalSettings.create({
                data: {
                    id: 'singleton',
                    email: 'support@ticketspro.in',
                    phone: '1800-123-4567',
                    address: '123 Express Hub, Tech Park Phase 2, Bengaluru, Karnataka 560100',
                    whatsapp: '',
                    facebook: '',
                    telegram: '',
                    otaVersion: ''
                }
            });
        }
        res.json({ success: true, settings });
    }
    catch (err) {
        console.error('Failed to get settings', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Update settings (Super Admin Only)
router.patch('/', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { email, phone, address, whatsapp, facebook, telegram } = req.body;
        const settings = await prisma_1.prisma.globalSettings.upsert({
            where: { id: 'singleton' },
            update: {
                email,
                phone,
                address,
                whatsapp,
                facebook,
                telegram
            },
            create: {
                id: 'singleton',
                email,
                phone,
                address,
                whatsapp: whatsapp || '',
                facebook: facebook || '',
                telegram: telegram || ''
            }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_GLOBAL_SETTINGS',
            performedByUserId: req.user.userId,
            details: `Updated global contact settings: ${JSON.stringify({ email, phone, address })}`
        });
        return res.json({ success: true, settings });
    }
    catch (error) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Trigger OTA Update (Super Admin Only)
router.post('/ota-update', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    try {
        const REMOTE_HOST = 'https://rail-planner-pro.web.app';
        console.log('[OTA] Fetching remote manifest from Firebase...');
        const response = await fetch(`${REMOTE_HOST}/manifest.json?t=${Date.now()}`);
        if (!response.ok) {
            return res.status(400).json({ error: 'Failed to fetch latest manifest from Firebase Hosting.' });
        }
        const manifest = await response.json();
        if (!manifest || !manifest.version) {
            return res.status(400).json({ error: 'Invalid manifest format on Firebase Hosting.' });
        }
        const settings = await prisma_1.prisma.globalSettings.upsert({
            where: { id: 'singleton' },
            update: { otaVersion: manifest.version },
            create: {
                id: 'singleton',
                email: 'support@ticketspro.in',
                phone: '1800-123-4567',
                address: '123 Express Hub, Tech Park Phase 2, Bengaluru, Karnataka 560100',
                otaVersion: manifest.version
            }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'PUSH_OTA_UPDATE',
            performedByUserId: req.user.userId,
            details: `Pushed OTA update to version ${manifest.version}`
        });
        return res.json({ success: true, otaVersion: manifest.version });
    }
    catch (error) {
        console.error('OTA Update trigger error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
exports.default = router;
