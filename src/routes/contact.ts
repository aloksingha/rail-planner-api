import { sendWhatsApp } from '../services/notificationService';
import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimit';
import { visitorShield } from '../services/visitorShieldService';

const router = express.Router();

// Public: Submit a contact message (rate limited & shielded to prevent bot flooding)
router.post('/', rateLimiter({ windowSeconds: 300, maxRequests: 5, message: 'Too many contact messages sent. Please wait 5 minutes before sending another inquiry.' }), async (req: Request, res: Response) => {
    const { name, email, subject, message, visitorTelemetry } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Run Visitor Intelligence & Bot Shield
    const visitorContext = visitorShield.inspectRequest(req, visitorTelemetry);

    // Silently discard automated headless bot spam without triggering WhatsApp alerts
    if (visitorContext.isBot) {
        console.warn(`[BotShield] Silently dropping automated scraper message from IP: ${visitorContext.ip}`);
        return res.json({ success: true, id: 'shielded_bot' });
    }

    try {
        // Embed structured telemetry signature into message for dashboard badge rendering
        const telemetryMeta = `\n\n[TELEMETRY_META: city=${encodeURIComponent(visitorContext.city)}|device=${encodeURIComponent(visitorContext.deviceSummary)}|source=${encodeURIComponent(visitorContext.sourceSummary)}|intent=${encodeURIComponent(visitorContext.intentSummary)}|shield=${visitorContext.shieldVerdict}]`;
        const enrichedMessage = `${message}${telemetryMeta}`;

        const msg = await prisma.contactMessage.create({
            data: { name, email, subject, message: enrichedMessage, status: 'UNREAD' }
        });

        // Trigger High-Priority WhatsApp notification to Admin Mobile
        (async () => {
            try {
                const settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
                const adminPhone = settings?.phone || '7318815790';
                if (adminPhone) {
                    const waText = 
`🚨 *TicketsPro Priority Alert: New Contact Inquiry!*

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

                    await sendWhatsApp(adminPhone, waText);
                    console.log(`✅ Admin alerted via WhatsApp with visitor intelligence for contact inquiry (${adminPhone})`);
                }
            } catch (notifyErr: any) {
                console.error('⚠️ Failed to dispatch WhatsApp admin alert for contact message:', notifyErr?.message || notifyErr);
            }
        })();

        return res.json({ success: true, id: msg.id });
    } catch (err: any) {
        console.error('Contact submit error:', err);
        return res.status(500).json({ error: 'Failed to save message.' });
    }
});

// Super Admin: Get all contact messages
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
    try {
        const messages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, messages });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Super Admin: Mark message as READ or RESOLVED
router.patch('/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const status = req.body.status as string;
    const valid = ['UNREAD', 'READ', 'RESOLVED'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const msg = await prisma.contactMessage.update({ where: { id }, data: { status } });
        return res.json({ success: true, message: msg });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Super Admin: Delete a message
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.contactMessage.delete({ where: { id } });
        return res.json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
