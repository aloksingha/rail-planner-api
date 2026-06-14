import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `promo_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPEG, PNG, GIF, and WEBP images are allowed.'));
    }
});

router.get('/', async (req, res) => {
    try {
        const promotions = await prisma.promotion.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, promotions });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch active promotions' });
    }
});

router.get('/admin', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const promotions = await prisma.promotion.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, promotions });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch promotions for management' });
    }
});

router.post('/admin', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), upload.single('image'), async (req, res) => {
    try {
        const { title, description, linkUrl } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const promotion = await prisma.promotion.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                imageUrl,
                linkUrl: linkUrl ? linkUrl.trim() : null,
                isActive: true
            }
        });

        return res.json({ success: true, promotion });
    } catch (error: any) {
        console.error('Failed to create promotion:', error);
        return res.status(500).json({ error: error.message || 'Failed to create promotion' });
    }
});

router.patch('/admin/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params as { id: string };
    const { title, description, linkUrl, isActive } = req.body;

    try {
        const promotion = await prisma.promotion.update({
            where: { id },
            data: {
                title: title !== undefined ? title.trim() : undefined,
                description: description !== undefined ? description.trim() : undefined,
                linkUrl: linkUrl !== undefined ? (linkUrl ? linkUrl.trim() : null) : undefined,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });
        return res.json({ success: true, promotion });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update promotion' });
    }
});

router.delete('/admin/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const { id } = req.params as { id: string };

    try {
        const promo = await prisma.promotion.findUnique({
            where: { id }
        });

        if (promo && promo.imageUrl) {
            const fileName = path.basename(promo.imageUrl);
            const filePath = path.join(__dirname, '..', '..', 'uploads', fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await prisma.promotion.delete({
            where: { id }
        });

        return res.json({ success: true, message: 'Promotion successfully deleted' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete promotion' });
    }
});

export default router;
