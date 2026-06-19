"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public: Submit a contact message
router.post('/', async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const msg = await prisma_1.prisma.contactMessage.create({
            data: { name, email, subject, message }
        });
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
