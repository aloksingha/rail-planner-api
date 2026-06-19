"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, path_1.default.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `promo_${Date.now()}${path_1.default.extname(file.originalname)}`)
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Only JPEG, PNG, GIF, and WEBP images are allowed.'));
    }
});
router.get('/', async (req, res) => {
    try {
        const promotions = await prisma_1.prisma.promotion.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, promotions });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch active promotions' });
    }
});
router.get('/admin', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const promotions = await prisma_1.prisma.promotion.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, promotions });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch promotions for management' });
    }
});
router.post('/admin', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), upload.single('image'), async (req, res) => {
    try {
        const { title, description, linkUrl } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }
        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        const promotion = await prisma_1.prisma.promotion.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                imageUrl,
                linkUrl: linkUrl ? linkUrl.trim() : null,
                isActive: true
            }
        });
        return res.json({ success: true, promotion });
    }
    catch (error) {
        console.error('Failed to create promotion:', error);
        return res.status(500).json({ error: error.message || 'Failed to create promotion' });
    }
});
router.patch('/admin/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { title, description, linkUrl, isActive } = req.body;
    try {
        const promotion = await prisma_1.prisma.promotion.update({
            where: { id },
            data: {
                title: title !== undefined ? title.trim() : undefined,
                description: description !== undefined ? description.trim() : undefined,
                linkUrl: linkUrl !== undefined ? (linkUrl ? linkUrl.trim() : null) : undefined,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });
        return res.json({ success: true, promotion });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to update promotion' });
    }
});
router.delete('/admin/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        const promo = await prisma_1.prisma.promotion.findUnique({
            where: { id }
        });
        if (promo && promo.imageUrl) {
            const fileName = path_1.default.basename(promo.imageUrl);
            const filePath = path_1.default.join(__dirname, '..', '..', 'uploads', fileName);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await prisma_1.prisma.promotion.delete({
            where: { id }
        });
        return res.json({ success: true, message: 'Promotion successfully deleted' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to delete promotion' });
    }
});
exports.default = router;
