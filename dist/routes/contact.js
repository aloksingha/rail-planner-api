"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notificationService_1 = require("../services/notificationService");
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const visitorShieldService_1 = require("../services/visitorShieldService");
const router = express_1.default.Router();
// Public: Submit a contact message (rate limited & shielded to prevent bot flooding)
router.post('/', (0, rateLimit_1.rateLimiter)({ windowSeconds: 300, maxRequests: 5, message: 'Too many contact messages sent. Please wait 5 minutes before sending another inquiry.' }), async (req, res) => {
    const { name, email, subject, message, visitorTelemetry } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    // Run Visitor Intelligence & Bot Shield
    const visitorContext = visitorShieldService_1.visitorShield.inspectRequest(req, visitorTelemetry);
    // Silently discard automated headless bot spam without triggering WhatsApp alerts
    if (visitorContext.isBot) {
        console.warn(`[BotShield] Silently dropping automated scraper message from IP: ${visitorContext.ip}`);
        return res.json({ success: true, id: 'shielded_bot' });
    }
    try {
        // Embed structured telemetry signature into message for dashboard badge rendering
        const telemetryMeta = `\n\n[TELEMETRY_META: city=${encodeURIComponent(visitorContext.city)}|device=${encodeURIComponent(visitorContext.deviceSummary)}|source=${encodeURIComponent(visitorContext.sourceSummary)}|intent=${encodeURIComponent(visitorContext.intentSummary)}|shield=${visitorContext.shieldVerdict}]`;
        const enrichedMessage = `${message}${telemetryMeta}`;
        const msg = await prisma_1.prisma.contactMessage.create({
            data: { name, email, subject, message: enrichedMessage, status: 'UNREAD' }
        });
        // Trigger High-Priority WhatsApp notification to Admin Mobile
        (async () => {
            try {
                const settings = await prisma_1.prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
                const adminPhone = settings?.phone || '7318815790';
                if (adminPhone) {
                    const waText = `🚨 *TicketsPro Priority Alert: New Contact Inquiry!*

👤 *Name:* ${name}
📧 *Email:* ${email}
📋 *Subject:* ${subject}
💬 *Message:*
"${message}"

📍 *Location:* ${visitorContext.city}${visitorContext.region ? `, ${visitorContext.region}` : ''} (${visitorContext.networkType})
📱 *Device:* ${visitorContext.deviceSummary}
🔥 *Visitor Intent:* ${visitorContext.intentSummary}
📊 *Ad Attribution:* ${visitorContext.sourceSummary}
🛡️ *Shield Verdict:* ${visitorContext.shieldVerdict === 'VERIFIED' ? '✅ Clean Verified' : '⚠️ Suspicious VPN'}

👉 *Manage in Contact Inbox:*
https://ticketspro.in/inbox`;
                    await (0, notificationService_1.sendWhatsApp)(adminPhone, waText);
                    console.log(`✅ Admin alerted via WhatsApp with visitor intelligence for contact inquiry (${adminPhone})`);
                }
            }
            catch (notifyErr) {
                console.error('⚠️ Failed to dispatch WhatsApp admin alert for contact message:', notifyErr?.message || notifyErr);
            }
        })();
        return res.json({ success: true, id: msg.id });
    }
    catch (err) {
        console.error('Contact submit error:', err);
        return res.status(500).json({ error: 'Failed to save message.' });
    }
});
// Super Admin: Get all contact messages
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const messages = await prisma_1.prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, messages });
    }
    catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Super Admin: Mark message as READ or RESOLVED
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const id = req.params.id;
    const status = req.body.status;
    const valid = ['UNREAD', 'READ', 'RESOLVED'];
    if (!valid.includes(status))
        return res.status(400).json({ error: 'Invalid status' });
    try {
        const msg = await prisma_1.prisma.contactMessage.update({ where: { id }, data: { status } });
        return res.json({ success: true, message: msg });
    }
    catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Super Admin: Delete a message
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        await prisma_1.prisma.contactMessage.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
